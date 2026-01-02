# Signup Integration Guide

This document explains how to integrate an upstream signup form with the Voice Intake conversation page.

## Overview

After a user completes the signup form, they should be redirected to the voice intake page with their name and email passed as URL query parameters.

## Redirect URL Format

```
https://your-domain.com/conversation?name=John%20Doe&email=john@example.com
```

## Required Parameters

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `name` | Yes | User's full name (URL encoded) | `Jane%20Smith` |
| `email` | Yes | User's email address | `jane@example.com` |

> **Note:** Both values should be URL-encoded. Spaces become `%20`, special characters are escaped.

## Example Implementations

### JavaScript / React

```javascript
// After form submission
const handleSubmit = (formData) => {
  const name = encodeURIComponent(formData.name);
  const email = encodeURIComponent(formData.email);
  
  // Redirect to voice intake
  window.location.href = `/conversation?name=${name}&email=${email}`;
};
```

### Next.js Router

```javascript
import { useRouter } from 'next/navigation';

const router = useRouter();

const handleSubmit = (formData) => {
  const params = new URLSearchParams({
    name: formData.name,
    email: formData.email,
  });
  
  router.push(`/conversation?${params.toString()}`);
};
```

### Plain HTML Form

```html
<form action="/conversation" method="GET">
  <input name="name" type="text" placeholder="Full Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <button type="submit">Continue to Voice Intake</button>
</form>
```

### Server-side Redirect (Node.js/Express)

```javascript
app.post('/signup', (req, res) => {
  const { name, email } = req.body;
  
  // Save user to database...
  
  // Redirect to voice intake
  const params = new URLSearchParams({ name, email });
  res.redirect(`/conversation?${params.toString()}`);
});
```

## What Happens Next

Once redirected, the voice intake page will:

1. Read the `name` and `email` from the URL
2. Associate those with the user's voice responses
3. Include them when submitting answers to the webhook

## Testing

You can test the integration by manually visiting:

```
http://localhost:3000/conversation?name=Test%20User&email=test@example.com
```

## Questions?

Contact the voice intake team if you need help with the integration.
