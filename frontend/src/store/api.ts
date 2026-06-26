import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Project, Transaction, User } from '../types';
import type { RootState } from './index';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    // ── Auth ──────────────────────────────────────────────────────────
    login: builder.mutation<{ token: string; user: User }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<{ token: string; user: User }, { name: string; email: string; password: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    // ── Projects ──────────────────────────────────────────────────────
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    addProject: builder.mutation<Project, Omit<Project, 'id' | 'pendingAmount' | 'status' | 'transactions'>>({
      query: (body) => ({ url: '/projects', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, { id: string; changes: Partial<Project> }>({
      query: ({ id, changes }) => ({ url: `/projects/${id}`, method: 'PUT', body: changes }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/projects/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),

    // ── Transactions ──────────────────────────────────────────────────
    addTransaction: builder.mutation<Transaction, Omit<Transaction, 'id'>>({
      query: (body) => ({ url: '/transactions', method: 'POST', body }),
      invalidatesTags: ['Project'],
    }),
    deleteTransaction: builder.mutation<{ message: string }, { id: string; projectId: string }>({
      query: ({ id }) => ({ url: `/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Project'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProjectsQuery,
  useAddProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAddTransactionMutation,
  useDeleteTransactionMutation,
} = api;
