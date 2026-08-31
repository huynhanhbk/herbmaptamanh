import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  // Allow CORS for any client / vercel preview domains
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType = 'image/jpeg', userNotes = '' } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'Thiếu dữ liệu hình ảnh (imageBase64)' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      error: 'GEMINI_API_KEY chưa được cấu hình trong Vercel Environment Variables. Vui lòng thêm biến môi trường GEMINI_API_KEY trong Vercel Project Settings hoặc nhập API Key trực tiếp trên giao diện ứng dụng.',
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

    const systemInstruction = `Bạn là Giám định viên Trưởng kiêm Chuyên gia Thực vật học và Dược liệu học hàng đầu Việt Nam, am tường hệ thực vật nhiệt đới và cây thuốc nam Trung Bộ (đặc biệt là xã Tam Anh, huyện Núi Thành, tỉnh Quảng Nam).
CƠ SỞ DỮ LIỆU ĐỐI CHIẾU DƯỢC LIỆU BẢN ĐỊA TAM ANH BAO GỒM:
1. Cà gai leo (Solanum procumbens Lour.): Dây leo trườn nhiều gai nhọn vàng, hoa tím nhạt hoặc trắng, quả chín đỏ tươi, gân lá có gai.
2. Khổ sâm cho lá (Croton tonkinensis): Mặt dưới lá phủ vảy lông màu trắng bạc lấp lánh, lá rất đắng, trị đau dạ dày.
3. Chè vằng (Jasminum subtriplinerve): Thân dây có đốt, lá có 3 gân hình cung nổi rất rõ từ gốc cuống lá, hoa trắng 5-8 cánh hình sao thơm nhẹ. (Cảnh giác không nhầm với Lá Ngón hoa vàng cực độc).
4. Kê huyết đằng (Spatholobus suberectus): Thân leo gỗ to, tiết nhựa đỏ như máu khi cắt ngang.
5. Dây thìa canh (Gymnema sylvestre): Dây leo có dịch mủ trắng, hoa vàng, lá mọc đối, nhai mất vị ngọt.
6. Kim ngân hoa (Lonicera japonica): Hoa hình ống mọc đôi đổi từ trắng sang vàng óng.
7. Ba kích (Morinda officinalis): Củ nạc thắt đốt như ruột gà, bẻ ra màu tím sẫm.
8. Cỏ mực / Nhọ nồi (Eclipta prostrata): Thân có lông ráp, vò ra nước dịch màu đen như mực tàu, hoa trắng nhỏ.
9. Xuyên tâm liên (Andrographis paniculata): Thân vuông 4 cạnh sắc nét, hoa trắng đốm tím, cực kỳ đắng.
10. Diệp hạ châu (Phyllanthus urinaria): Hàng quả tròn nhỏ xếp tăm tắp dưới cuống lá.
11. Sâm cau / Tiên mao (Curculigo orchioides): Lá dài xếp nếp như lá cau non, hoa vàng 6 cánh mọc sát mặt đất.
12. Mướp đắng rừng (Momordica charantia var. abbreviata): Lá xẻ thùy chân vịt sâu, quả nhỏ nhiều gai sần sùi.
13. Ngũ gia bì gai (Eleutherococcus trifoliatus): Lá kép chân vịt 3 lá chét, cành có gai quặp xuống.
14. Trinh nữ hoàng cung (Crinum latifolium): Lá dài bản rộng mép lượn sóng, củ hành to, hoa trắng phớt tím.
15. Rau má (Centella asiatica): Thân bò, lá hình thận đồng tiền khía tai bèo.

NHIỆM VỤ CỦA BẠN:
- Giám định chính xác tuyệt đối hình ảnh thực vật được tải lên.
- Quan sát tỉ mỉ: dạng thân, kiểu lá, phiến lá, mép lá, gân lá, màu sắc hoa, quả, gai, cuống.
- Đưa ra đúng 3 phương án loài tiềm năng xếp thứ tự giảm dần theo độ tin cậy. Nếu phát hiện đúng 1 trong các loài dược liệu Tam Anh hoặc cây thuốc miền Trung, hãy gán độ tin cậy cao (85-98%).
- Mô tả chi tiết những đặc điểm hình thái nhìn thấy trên ảnh (observedFeatures) và mẹo phân biệt thực địa (distinctionTips).`;

    const prompt = `Phân tích toàn diện ảnh thực vật này. Quan sát tỉ mỉ đặc điểm hình thái lá, gân, thân, hoa, quả. Ghi chú khảo sát thực địa người dùng: "${userNotes || 'Không có'}". Trả về kết quả JSON theo đúng schema.`;

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
      source: 'gemini-3.7-flash-vercel',
    });
  } catch (error: any) {
    console.error('Vercel API identify error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý nhận diện AI trên Vercel',
    });
  }
}
