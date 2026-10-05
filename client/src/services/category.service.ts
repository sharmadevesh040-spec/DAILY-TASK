import api from './api';
import { Category } from '../types';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const { data } = await api.get('/categories');
    return data.data.categories;
  },

  async createCategory(payload: { name: string; color: string }): Promise<Category> {
    const { data } = await api.post('/categories', payload);
    return data.data.category;
  },

  async updateCategory(id: string, payload: { name?: string; color?: string }): Promise<Category> {
    const { data } = await api.put(`/categories/${id}`, payload);
    return data.data.category;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
