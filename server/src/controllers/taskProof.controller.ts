import { Response } from 'express';
import multer from 'multer';
import { prisma } from '../utils/prisma';
import { successResponse, errorResponse } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { uploadImageBuffer, isSupportedImage } from '../services/storageService';
import { verifyTaskCompletionPhoto } from '../services/aiService';
import { createNotification } from '../services/notificationService';
import { addDays, addWeeks, addMonths, isWeekend } from '../utils/dateHelpers';

// Multer in-memory storage config
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (isSupportedImage(file.mimetype, file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a JPEG, PNG, WEBP, or HEIC photo.'));
    }
  },
});

/**
 * Handle recurring task next occurrence creation
 */
export async function handleRecurringTaskCreation(task: any, userId: string) {
  if (!task.recurringTask || !task.dueDate) return;

  const rt = task.recurringTask;
  const shouldContinue = !rt.endDate || new Date() < rt.endDate;
  if (!shouldContinue) return;

  let nextDue = new Date(task.dueDate);

  switch (rt.recurrenceType) {
    case 'DAILY':
      nextDue = addDays(nextDue, rt.recurrenceInterval);
      break;
    case 'WEEKDAYS': {
      nextDue = addDays(nextDue, 1);
      while (isWeekend(nextDue)) nextDue = addDays(nextDue, 1);
      break;
    }
    case 'WEEKLY':
      nextDue = addWeeks(nextDue, rt.recurrenceInterval);
      break;
    case 'MONTHLY':
      nextDue = addMonths(nextDue, rt.recurrenceInterval);
      break;
    case 'CUSTOM':
      nextDue = addDays(nextDue, rt.recurrenceInterval);
      break;
  }

  if (!rt.endDate || nextDue <= rt.endDate) {
    const duplicate = await prisma.task.findFirst({
      where: {
        userId,
        title: task.title,
        dueDate: nextDue,
        status: { not: 'COMPLETED' },
      },
    });

    if (!duplicate) {
      const nextTask = await prisma.task.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          categoryId: task.categoryId,
          dueDate: nextDue,
          dueTime: task.dueTime,
          status: 'TODO',
        },
      });

      await prisma.recurringTask.create({
        data: {
          taskId: nextTask.id,
          recurrenceType: rt.recurrenceType,
          recurrenceInterval: rt.recurrenceInterval,
          endDate: rt.endDate,
        },
      });

      await prisma.taskHistory.create({
        data: {
          taskId: nextTask.id,
          userId,
          action: 'CREATED',
          details: `Recurring task created from "${task.title}"`,
        },
      });
    }
  }
}

/**
 * POST /api/tasks/:id/submit-completion
 * FEATURE 1: Submit completion photo for AI verification
 */
export async function submitTaskCompletionPhoto(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const notes = req.body.notes || '';

    if (!req.file) {
      errorResponse(res, 'A completion photo is required. Please capture or upload a clear image.', 400);
      return;
    }

    // 1. Verify task ownership
    const task = await prisma.task.findFirst({
      where: { id, userId: req.userId },
      include: { category: true, recurringTask: true },
    });

    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    // 2. Upload image to object storage (Cloudinary or local static fallback)
    const { url: imageUrl, key: imageKey } = await uploadImageBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // 3. Perform AI Vision Verification
    const verification = await verifyTaskCompletionPhoto({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      taskTitle: task.title,
      taskDescription: task.description,
      categoryName: task.category?.name,
      notes,
    });

    const isVerified = verification.verified;
    const verificationStatus = isVerified ? 'VERIFIED' : 'REJECTED';

    // 4. Save TaskProof record
    const proof = await prisma.taskProof.create({
      data: {
        taskId: task.id,
        userId: req.userId!,
        imageUrl,
        imageKey,
        notes,
        status: verificationStatus,
        aiScore: verification.confidence,
        aiFeedback: verification.feedback,
        aiDetails: JSON.stringify({
          relevanceScore: verification.relevanceScore,
          observations: verification.visualObservations,
        }),
        reviewedAt: new Date(),
      },
    });

    // 5. Update Task
    let updatedTask;
    if (isVerified) {
      updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          verificationStatus: 'VERIFIED',
          completedAt: new Date(),
          proofPhotoUrl: imageUrl,
          proofPhotoKey: imageKey,
          verificationFeedback: verification.feedback,
        },
        include: { category: true, reminders: true, recurringTask: true, taskProofs: true },
      });

      // Handle recurring task logic
      await handleRecurringTaskCreation(task, req.userId!);

      // Send In-App & Web Push Notification
      await createNotification({
        userId: req.userId!,
        type: 'VERIFICATION_SUCCESS',
        title: 'Task Verified & Completed! 🎉',
        message: `Photo verification accepted for "${task.title}": ${verification.feedback}`,
        taskId: task.id,
        metadata: { proofId: proof.id, imageUrl },
      });

      // Task audit history
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          userId: req.userId!,
          action: 'PHOTO_VERIFIED',
          details: `Completed via photo verification: ${verification.feedback}`,
        },
      });
    } else {
      // Rejected: task remains incomplete, record rejection reason
      updatedTask = await prisma.task.update({
        where: { id: task.id },
        data: {
          verificationStatus: 'REJECTED',
          proofPhotoUrl: imageUrl,
          proofPhotoKey: imageKey,
          verificationFeedback: verification.feedback,
        },
        include: { category: true, reminders: true, recurringTask: true, taskProofs: true },
      });

      // Send rejection notification with explanation
      await createNotification({
        userId: req.userId!,
        type: 'VERIFICATION_REJECTED',
        title: 'Photo Verification Needs Revision',
        message: `Photo for "${task.title}" could not be verified: ${verification.feedback}. You can submit another photo anytime.`,
        taskId: task.id,
        metadata: { proofId: proof.id, reason: verification.feedback },
      });

      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          userId: req.userId!,
          action: 'PHOTO_REJECTED',
          details: `Photo verification rejected: ${verification.feedback}`,
        },
      });
    }

    successResponse(
      res,
      {
        verified: isVerified,
        status: verificationStatus,
        feedback: verification.feedback,
        confidence: verification.confidence,
        relevanceScore: verification.relevanceScore,
        task: updatedTask,
        proof,
      },
      isVerified
        ? 'Photo verified! Task marked as completed.'
        : 'Photo could not be verified. Please review the feedback and submit again.',
      200
    );
  } catch (err: any) {
    console.error('submitTaskCompletionPhoto error:', err);
    errorResponse(res, err?.message || 'Failed to process photo submission', 500);
  }
}

/**
 * GET /api/tasks/:id/proofs
 * Get verification submission history for a task
 */
export async function getTaskProofs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: { id, userId: req.userId },
    });

    if (!task) {
      errorResponse(res, 'Task not found', 404);
      return;
    }

    const proofs = await prisma.taskProof.findMany({
      where: { taskId: id, userId: req.userId },
      orderBy: { submittedAt: 'desc' },
    });

    successResponse(res, { proofs });
  } catch (err) {
    console.error('getTaskProofs error:', err);
    errorResponse(res, 'Failed to fetch task proofs', 500);
  }
}
