
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { user_id, channel_id } = req.query;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  // Use channel_id from query if provided, otherwise fallback to env variable
  const targetChannelId = channel_id || process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !targetChannelId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or Channel ID');
    // Если конфигурация отсутствует, возвращаем ошибку.
    return res.status(200).json({ subscribed: false, error: 'Server configuration missing' });
  }

  if (!user_id) {
    return res.status(200).json({ subscribed: false, error: 'User ID missing' });
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${targetChannelId}&user_id=${user_id}`;
    const telegramRes = await fetch(url);
    const data = await telegramRes.json();

    if (!data.ok) {
      console.error('Telegram API Error:', data);
      return res.status(200).json({ subscribed: false, telegramError: data.description });
    }

    const status = data.result.status;
    // Статусы, считающиеся подпиской: создатель, админ, участник
    const allowedStatuses = ['creator', 'administrator', 'member'];
    const isSubscribed = allowedStatuses.includes(status);

    return res.status(200).json({ subscribed: isSubscribed });
  } catch (error) {
    console.error('Subscription check failed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
