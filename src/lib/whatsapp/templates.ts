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
