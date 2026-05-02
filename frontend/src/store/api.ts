import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Project, Transaction } from '../types';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ 
    baseUrl: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5001/api' 
  }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({
      query: () => '/projects',
      providesTags: ['Project'],
    }),
    addProject: builder.mutation<Project, Omit<Project, 'id' | 'pendingAmount' | 'status' | 'transactions'>>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, { id: string; changes: Partial<Project> }>({
      query: ({ id, changes }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body: changes,
      }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
    addTransaction: builder.mutation<Transaction, Omit<Transaction, 'id'>>({
      query: (body) => ({
        url: '/transactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
    deleteTransaction: builder.mutation<{ message: string }, { id: string; projectId: string }>({
      query: ({ id }) => ({
        url: `/transactions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useAddProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useAddTransactionMutation,
  useDeleteTransactionMutation,
} = api;
