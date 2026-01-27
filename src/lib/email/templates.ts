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

/**
 * Introduction email templates for connecting matched attendees
 */

interface IntroductionEmailParams {
  eventName: string
  personAName: string
  personAEmail: string
  personBName: string
  personBEmail: string
  commonInterests: string
  organizerName?: string
}

export function getIntroductionEmailSubject(
  eventName: string,
  personAName: string,
  personBName: string
): string {
  return `${eventName}: Meet ${personAName} and ${personBName}!`
}

export function getIntroductionEmailHtml({
  eventName,
  personAName,
  personAEmail,
  personBName,
  personBEmail,
  commonInterests,
  organizerName = 'The Event Team',
}: IntroductionEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventName} - Introduction</title>
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
                Hi ${personAName} and ${personBName}!
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Based on your responses at <strong style="color: #ffffff;">${eventName}</strong>, we think you two would really hit it off!
              </p>

              <!-- Person Cards -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
                <tr>
                  <td style="padding: 16px; background-color: #262626; border-radius: 8px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="50%" style="padding-right: 8px; vertical-align: top;">
                          <div style="text-align: center;">
                            <div style="width: 48px; height: 48px; background-color: #ec4899; border-radius: 50%; line-height: 48px; font-size: 18px; font-weight: 600; margin: 0 auto 8px auto; color: #ffffff;">
                              ${personAName.charAt(0).toUpperCase()}
                            </div>
                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">${personAName}</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">${personAEmail}</p>
                          </div>
                        </td>
                        <td width="50%" style="padding-left: 8px; vertical-align: top;">
                          <div style="text-align: center;">
                            <div style="width: 48px; height: 48px; background-color: #8b5cf6; border-radius: 50%; line-height: 48px; font-size: 18px; font-weight: 600; margin: 0 auto 8px auto; color: #ffffff;">
                              ${personBName.charAt(0).toUpperCase()}
                            </div>
                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #ffffff;">${personBName}</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #71717a;">${personBEmail}</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Common Interests -->
              <div style="margin: 24px 0; padding: 16px; background-color: #262626; border-radius: 8px; border-left: 3px solid #ec4899;">
                <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #ec4899; font-weight: 600;">
                  What you have in common
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #e4e4e7;">
                  ${commonInterests}
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #a1a1aa;">
                Feel free to reply-all to this email to start the conversation. We hope this connection leads to something great!
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

export function getIntroductionEmailText({
  eventName,
  personAName,
  personAEmail,
  personBName,
  personBEmail,
  commonInterests,
  organizerName = 'The Event Team',
}: IntroductionEmailParams): string {
  return `
Hi ${personAName} and ${personBName}!

Based on your responses at ${eventName}, we think you two would really hit it off!

---

${personAName} (${personAEmail})
${personBName} (${personBEmail})

---

WHAT YOU HAVE IN COMMON:
${commonInterests}

---

Feel free to reply-all to this email to start the conversation. We hope this connection leads to something great!

---
Sent by ${organizerName}
Powered by Matchys.ai
  `.trim()
}
