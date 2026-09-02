export function validateColabAuthorizationUrl(value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error('Colab returned an invalid authorization URL.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('Colab authorization URL must use HTTPS.')
  }

  if (url.hostname !== 'accounts.google.com') {
    throw new Error('Colab authorization URL has an unexpected host.')
  }

  if (!url.pathname.startsWith('/o/oauth2/')) {
    throw new Error('Colab authorization URL has an unexpected path.')
  }

  return url.toString()
}
