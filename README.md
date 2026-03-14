# LINE x Claude Webhook

Node.js server รับ webhook จาก LINE แล้วส่งไปให้ Claude ตอบอัตโนมัติเป็นภาษาไทย

## วิธีติดตั้ง

```bash
npm install
npm start
```

## วิธี Deploy

เซิร์ฟเวอร์ต้องเข้าถึงได้จาก internet (HTTPS) เช่น:
- **Railway** → https://railway.app
- **Render** → https://render.com  
- **Fly.io** → https://fly.io
- **ngrok** (สำหรับ test) → `ngrok http 3000`

## ตั้งค่า LINE Webhook URL

1. เข้า [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel → Messaging API
3. ตั้ง Webhook URL เป็น `https://YOUR_DOMAIN/webhook`
4. เปิด **Use webhook** = ON
5. กด **Verify** เพื่อทดสอบ

## Flow การทำงาน

```
User ส่งข้อความใน LINE
        ↓
LINE ส่ง webhook POST /webhook
        ↓
Server ตรวจ signature (HMAC-SHA256)
        ↓
ส่ง text ไปหา Claude API
        ↓
นำคำตอบ reply กลับไปใน LINE
```
