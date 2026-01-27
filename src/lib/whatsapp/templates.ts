interface WhatsAppTemplateParams {
  attendeeName: string
  eventName: string
  intakeUrl: string
  organizerName: string
}

export function getWhatsAppOutreachMessage({
  attendeeName,
  eventName,
  intakeUrl,
  organizerName,
}: WhatsAppTemplateParams): string {
  const name = attendeeName || 'there'

  return `Hi ${name}! 👋

You're invited to share what you're looking for at ${eventName} so we can match you with the right people.

Tap here to start: ${intakeUrl}

- ${organizerName}`
}

/**
 * Introduction WhatsApp message template
 * Since WhatsApp can't CC, we send separate messages to each person
 */

interface IntroductionWhatsAppParams {
  recipientName: string
  matchName: string
  matchEmail: string
  eventName: string
  commonInterests: string
  organizerName: string
}

export function getIntroductionWhatsAppMessage({
  recipientName,
  matchName,
  matchEmail,
  eventName,
  commonInterests,
  organizerName,
}: IntroductionWhatsAppParams): string {
  const name = recipientName || 'there'

  return `Hi ${name}! 🤝

Great news from ${eventName}! Based on what you shared, we think you'd really connect with *${matchName}* (${matchEmail}).

*What you have in common:*
${commonInterests}

Feel free to reach out to them - we hope this connection leads to something great!

- ${organizerName}`
}
