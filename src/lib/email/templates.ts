/**
 * Email templates for attendee outreach
 */

interface OutreachEmailParams {
  attendeeName: string | null
  eventName: string
  intakeUrl: string
  organizerName?: string
}

export function getOutreachEmailSubject(eventName: string): string {
  return `Share your interests for ${eventName}`
}

export function getOutreachEmailHtml({
  attendeeName,
  eventName,
  intakeUrl,
  organizerName = 'The Event Team',
}: OutreachEmailParams): string {
  const greeting = attendeeName ? `Hi ${attendeeName},` : 'Hi there,'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventName} - Tell us about yourself</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">

          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <div style="display: inline-block; width: 60px; height: 60px; background-color: #ec4899; border-radius: 12px; line-height: 60px; font-size: 24px;">
                M
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #171717; border-radius: 12px; padding: 40px; border: 1px solid #262626;">
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                ${greeting}
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                You're registered for <strong style="color: #ffffff;">${eventName}</strong>! We'd love to learn about you so we can help connect you with the right people.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Take 3 minutes to share your interests - you can chat with our AI assistant or have a quick voice conversation.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${intakeUrl}" style="display: inline-block; background-color: #ec4899; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                      Share Your Interests
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                This helps us match you with other attendees who share similar interests and goals.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                Sent by ${organizerName}
              </p>
              <p style="margin: 0; font-size: 12px; color: #52525b;">
                Powered by Matchys.ai
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function getOutreachEmailText({
  attendeeName,
  eventName,
  intakeUrl,
  organizerName = 'The Event Team',
}: OutreachEmailParams): string {
  const greeting = attendeeName ? `Hi ${attendeeName},` : 'Hi there,'

  return `
${greeting}

You're registered for ${eventName}! We'd love to learn about you so we can help connect you with the right people.

Take 3 minutes to share your interests - you can chat with our AI assistant or have a quick voice conversation.

Share Your Interests: ${intakeUrl}

This helps us match you with other attendees who share similar interests and goals.

---
Sent by ${organizerName}
Powered by Matchys.ai
  `.trim()
}
