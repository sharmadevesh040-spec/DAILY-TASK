import api from './api';
import { User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'PASSWORD_RESET';

export interface SendOtpPayload {
  email: string;
  purpose: OtpPurpose;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  purpose: OtpPurpose;
}

/** Response when purpose=REGISTER — OTP verified but account not yet created */
export interface OtpVerifiedResponse {
  verified: true;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', payload);
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },

  async updateProfile(payload: { name?: string; avatar?: string }): Promise<User> {
    const { data } = await api.put('/auth/profile', payload);
    return data.data.user;
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.put('/auth/change-password', payload);
  },

  /** Send a 6-digit OTP to the given email address */
  async sendOtp(payload: SendOtpPayload): Promise<void> {
    await api.post('/auth/send-otp', payload);
  },

  /**
   * Verify OTP for LOGIN/PASSWORD_RESET → returns { token, user }
   * Verify OTP for REGISTER → returns { verified: true } (account NOT created yet)
   */
  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse | OtpVerifiedResponse> {
    const { data } = await api.post('/auth/verify-otp', payload);
    return data.data;
  },
};
