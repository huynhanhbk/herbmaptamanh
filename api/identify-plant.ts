import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType = 'image/jpeg', userNotes = '' } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'Thiếu dữ liệu hình ảnh (imageBase64)' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured on Vercel environment.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const systemInstruction = `Bạn là một Chuyên gia Giám định Thực vật học và Dược liệu học hàng đầu Việt Nam, am hiểu sâu sắc về hệ thực vật nhiệt đới, cây thuốc nam và thảm thực vật miền Trung (đặc biệt là xã Tam Anh, huyện Núi Thành, tỉnh Quảng Nam).
NHIỆM VỤ: Phân tích cẩn trọng và chi tiết hình ảnh thực vật được tải lên (thân, lá, mép lá, gân lá, hoa, quả, màu sắc), đối chiếu với Dược điển Việt Nam và các tài liệu chuyên ngành để xác định chính xác nhất 3 loài cây tiềm năng xếp theo độ tin cậy giảm dần.`;

    const prompt = `Phân tích toàn diện bức ảnh thực vật này. Quan sát tỉ mỉ hình thái thân cây, lá cây, hoa, quả. Ghi chú thực địa: "${userNotes || 'Không có'}". Trả về JSON theo đúng định dạng.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        candidates: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              vietnameseName: { type: Type.STRING },
              otherNames: { type: Type.STRING },
              scientificName: { type: Type.STRING },
              family: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              observedFeatures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              habitatInCentralVietnam: { type: Type.STRING },
              folkUseSummary: { type: Type.STRING },
              distinctionTips: { type: Type.STRING },
            },
            required: ['vietnameseName', 'scientificName', 'family', 'confidence', 'observedFeatures'],
          },
        },
        safetyDisclaimer: { type: Type.STRING },
      },
      required: ['summary', 'candidates', 'safetyDisclaimer'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const responseText = response.text || '{}';
    const data = JSON.parse(responseText);

    return res.status(200).json({
      success: true,
      data,
      model: 'gemini-3.7-flash',
    });
  } catch (error: any) {
    console.error('Vercel API identify error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nhận diện AI',
    });
  }
}
