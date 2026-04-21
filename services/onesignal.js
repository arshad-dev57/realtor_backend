// services/onesignal.js
const axios = require("axios");
const Notification = require('../models/notification.model');

function buildExternalId(mongoUserId) {
  const env = (process.env.ONESIGNAL_ENV || "dev").trim();
  return `${env}:${String(mongoUserId).trim()}`;
}

async function sendToUser({ mongoUserId, subscriptionId, title, message, data = {}, collapseId }) {
  const externalId = buildExternalId(mongoUserId);

  // ✅ Save notification to database
  try {
    const notification = new Notification({
      userId: mongoUserId,
      title: title || "Templink",
      message: message || "",
      type: data.type || 'general',
      data: data,
      isRead: false
    });
    await notification.save();
    console.log(`✅ Notification saved to DB: ${notification._id} for user: ${mongoUserId}`);
    
    // Add notificationId to data for frontend
    data.notificationId = notification._id.toString();
  } catch (dbError) {
    console.error('❌ Failed to save notification to DB:', dbError.message);
    // Continue with push notification even if DB save fails
  }

  // ✅ Send push notification via OneSignal
  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,
    headings: { en: title || "Templink" },
    contents: { en: message || "" },
    data: { ...data, timestamp: new Date().toISOString() },
    ...(collapseId ? { collapse_id: collapseId } : {}),
  };
  
  if (subscriptionId) {
    payload.include_subscription_ids = [subscriptionId];
  } else {
    payload.target_channel = "push";
    payload.include_aliases = { external_id: [externalId] };
  }

  try {
    const res = await axios.post(
      "https://api.onesignal.com/notifications?c=push",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
        timeout: 15000,
      }
    );
    console.log(`✅ OneSignal push sent: ${res.data.id}`);
    return res.data;
  } catch (pushError) {
    console.error('❌ OneSignal push error:', pushError.response?.data || pushError.message);
    throw pushError;
  }
}

module.exports = { sendToUser, buildExternalId };