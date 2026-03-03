const axios = require('axios')
const { GoogleAuth } = require('google-auth-library')

const FCM_V1_ENDPOINT = 'https://fcm.googleapis.com/v1'

async function readServiceAccount() {
    if (process.env.FCM_SERVICE_ACCOUNT_JSON) {
        try {
            return JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON)
        } catch (err) {
            console.warn('[FCM] Failed to parse FCM_SERVICE_ACCOUNT_JSON', err?.message)
            return null
        }
    }
}

const sendV1 = async ({ tokens, title, body, data }) => {
    if (!tokens?.length) return { skipped: true, reason: 'no tokens' }
    const sa = await readServiceAccount()
    if (!sa) return { skipped: true, reason: 'missing service account' }

    const projectId = process.env.FCM_PROJECT_ID || sa.project_id
    if (!projectId) return { skipped: true, reason: 'missing projectId' }

    const auth = new GoogleAuth({
        credentials: sa,
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    const client = await auth.getClient()
    const accessToken = await client.getAccessToken()
    if (!accessToken?.token) return { skipped: true, reason: 'no access token' }

    for (const token of tokens) {
        const payload = {
            message: {
                token,
                notification: title || body ? { title, body } : undefined,
                data,
            },
        }

        try {
            await axios.post(`${FCM_V1_ENDPOINT}/projects/${projectId}/messages:send`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken.token}`,
                },
                timeout: 5000,
            })
        } catch (err) {
            const status = err?.response?.status
            const body = err?.response?.data
            console.warn('[FCM] v1 send failed', { status, body })
            err.token = token
            throw err
        }
    }
    return { sent: tokens.length, transport: 'v1' }
}

const sendFcmNotification = async ({ tokens, title, body, data = {} }) => {
    return sendV1({ tokens, title, body, data })
}

module.exports = { sendFcmNotification }