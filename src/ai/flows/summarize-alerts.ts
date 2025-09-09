'use server';

/**
 * @fileOverview A smart alert summarization AI agent.
 *
 * - summarizeAlerts - A function that summarizes RO device alerts.
 * - SummarizeAlertsInput - The input type for the summarizeAlerts function.
 * - SummarizeAlertsOutput - The return type for the summarizeAlerts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAlertsInputSchema = z.array(
  z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    action: z.string(),
  })
);
export type SummarizeAlertsInput = z.infer<typeof SummarizeAlertsInputSchema>;

const SummarizeAlertsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the alerts.'),
});
export type SummarizeAlertsOutput = z.infer<typeof SummarizeAlertsOutputSchema>;

export async function summarizeAlerts(input: SummarizeAlertsInput): Promise<SummarizeAlertsOutput> {
  return summarizeAlertsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAlertsPrompt',
  input: {schema: SummarizeAlertsInputSchema},
  output: {schema: SummarizeAlertsOutputSchema},
  prompt: `You are an AI assistant that summarizes alerts from an RO water purification device.

  Given the following alerts, provide a concise summary of the most important issues. Focus on critical issues like filter replacement, water quality, and rental expiration.

  Alerts:
  {{#each this}}
  - Type: {{type}}, Message: {{message}}, Action: {{action}}
  {{/each}}

  Summary:`,
});

const summarizeAlertsFlow = ai.defineFlow(
  {
    name: 'summarizeAlertsFlow',
    inputSchema: SummarizeAlertsInputSchema,
    outputSchema: SummarizeAlertsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
