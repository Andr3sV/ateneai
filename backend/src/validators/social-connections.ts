import { z } from 'zod';

// Schema para validar entrada de conexión social
export const socialConnectionInputSchema = z.object({
  platform: z.enum(['facebook', 'instagram']),
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  redirectUri: z.string().url('Invalid redirect URI')
});

// Schema para validar configuración de webhook
export const webhookConfigSchema = z.object({
  platform: z.enum(['facebook', 'instagram']),
  webhookUrl: z.string().url('Invalid webhook URL'),
  verifyToken: z.string().min(1, 'Verify token is required'),
  subscribedFields: z.array(z.string()).optional().default([])
});

// Schema para validar evento de webhook
export const webhookEventSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    time: z.number().optional(),
    messaging: z.array(z.any()).optional(),
    changes: z.array(z.any()).optional()
  }))
});

// Función de validación para entrada de conexión social
export function validateSocialConnectionInput(data: any) {
  return socialConnectionInputSchema.parse(data);
}

// Función de validación para configuración de webhook
export function validateWebhookConfig(data: any) {
  return webhookConfigSchema.parse(data);
}

// Función de validación para evento de webhook
export function validateWebhookEvent(data: any) {
  return webhookEventSchema.parse(data);
}

// Tipos derivados de los schemas
export type SocialConnectionInput = z.infer<typeof socialConnectionInputSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;