import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Chỉ hỗ trợ phương thức POST" });
  }

  try {
    const { imageBase64, mimeType = "image/jpeg", userNotes = "" } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Vui lòng cung cấp hình ảnh cây thuốc để nhận diện." });
    }

    // Clean base64 and mime extraction
    let cleanBase64 = imageBase64;
    let effectiveMime = mimeType;

    if (imageBase64.startsWith("http://") || imageBase64.startsWith("https://")) {
      try {
        const imgRes = await fetch(imageBase64);
        const arrayBuffer = await imgRes.arrayBuffer();
        cleanBase64 = Buffer.from(arrayBuffer).toString("base64");
        effectiveMime = imgRes.headers.get("content-type") || "image/jpeg";
      } catch (fetchErr) {
        console.warn("Could not fetch remote image URL:", fetchErr);
      }
    } else if (imageBase64.includes(",")) {
      const parts = imageBase64.split(",");
      cleanBase64 = parts[1];
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch && mimeMatch[1]) {
        effectiveMime = mimeMatch[1];
      }
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(effectiveMime)) {
      effectiveMime = "image/jpeg";
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "Thiếu GEMINI_API_KEY trên môi trường máy chủ.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `Bạn là Chuyên gia Giám định Thực vật học và Dược liệu học hàng đầu Việt Nam (kết hợp tri thức Viện Dược liệu, Dược điển Việt Nam V, Cây thuốc & Vị thuốc Việt Nam - GS. Đỗ Tất Lợi, Plants of the World Online - Kew, và CSDL Thực vật miền Trung).

NHIỆM VỤ CỐT LÕI:
Phân tích tỉ mỉ và khách quan bức ảnh thực vật/cây thuốc được cung cấp. Dựa trên các đặc điểm hình thái và giải phẫu có thể quan sát trực tiếp trong ảnh (kiểu thân, cách đính lá, dạng phiến lá, mép lá, hệ gân lá, hoa, quả, màu sắc, gai, lông tơ...), hãy đối chiếu với cơ sở dữ liệu thực vật học toàn diện để xác định đúng loài cây trong ảnh.

QUY TẮC PHÂN LOẠI & ĐÁNH GIÁ:
1. TUYỆT ĐỐI KHÔNG TRẢ VỀ CÁC KẾT QUẢ RẬP KHUÔN HOẶC MẶC ĐỊNH. Mỗi hình ảnh phải được giám định độc lập và đưa ra đúng các loài thực vật tương ứng với đặc điểm thị giác trong ảnh (ví dụ: nếu ảnh là Lá lốt, Tía tô, Trầu không, Đinh lăng, Hoa cúc, Rau má, Cây cỏ tranh... thì PHẢI nhận diện chính xác loài đó).
2. Đưa ra chính xác 3 GỢI Ý PHÂN LOẠI XẾP THEO ĐỘ TIN CẬY GIẢM DẦN:
   - Gợi ý 1: Loài cây thực vật/dược liệu có đặc điểm hình thái học khớp nhất với bức ảnh (độ tin cậy cao nhất).
   - Gợi ý 2: Loài cây dược liệu tiềm năng thứ hai (cùng chi, cùng họ hoặc có đặc điểm hình thái gần giống).
   - Gợi ý 3: Loài cây/dược liệu tương tự hoặc dễ gây nhầm lẫn để người khảo sát đối chiếu và loại trừ.
3. Với mỗi loài, phải phân tích rõ:
   - Tên tiếng Việt phổ thông chính xác (kèm tên địa phương nếu có).
   - Tên khoa học quốc tế đầy đủ (Binomial nomenclature, kèm tên tác giả danh pháp).
   - Họ thực vật học (Tên Việt & Tên Latinh).
   - Tỷ lệ tin cậy từ 0 - 100% phản ánh trung thực mức độ rõ ràng của ảnh và độ trùng khớp hình thái.
   - Các đặc điểm hình thái quan sát được trực tiếp trong ảnh chứng minh cho nhận định (Thân, Lá, Hoa, Quả, Gân lá, Mép lá...).
   - Bộ phận dùng & Công dụng dược liệu chính theo Y học cổ truyền và Dược lý học hiện đại.
   - Sinh cảnh sống và phân bố tự nhiên (đặc biệt tại miền Trung / Việt Nam).
   - Dấu hiệu then chốt để phân biệt chính xác với các loài tương tự hoặc cây dại độc.`;

    const prompt = `Phân tích toàn diện bức ảnh thực vật này. Quan sát tỉ mỉ hình thái thân cây, lá cây (cách mọc, phiến lá, gân lá, mép lá), hoa, quả hoặc các cơ quan sinh dưỡng khác có trong ảnh. 
Ghi chú bổ sung từ người khảo sát thực địa: "${userNotes || 'Không có ghi chú thêm'}".
Hãy tra cứu đối chiếu và trả về JSON chứa 3 phương án gợi ý cây dược liệu/thực vật chính xác và sát thực tế nhất.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "Mô tả chi tiết và khách quan về các đặc điểm hình thái thực vật quan sát được trực tiếp từ bức ảnh (dạng thân, kiểu lá, gân lá, hoa, quả...)",
        },
        candidates: {
          type: Type.ARRAY,
          description: "Danh sách đúng 3 loài cây tiềm năng nhất xếp theo mức độ tin cậy giảm dần",
          items: {
            type: Type.OBJECT,
            properties: {
              vietnameseName: {
                type: Type.STRING,
                description: "Tên tiếng Việt phổ thông chính xác nhất (ví dụ: Lá lốt, Cà gai leo, Kim ngân hoa, Ba kích, Dây thìa canh...)",
              },
              otherNames: {
                type: Type.STRING,
                description: "Tên gọi dân gian hoặc tên gọi địa phương khác nếu có",
              },
              scientificName: {
                type: Type.STRING,
                description: "Tên khoa học quốc tế đầy đủ (ví dụ: Piper sarmentosum Roxb.)",
              },
              family: {
                type: Type.STRING,
                description: "Họ thực vật học (ví dụ: Họ Hồ tiêu - Piperaceae)",
              },
              confidence: {
                type: Type.NUMBER,
                description: "Mức độ tin cậy từ 0 đến 100 (%) phản ánh mức độ trùng khớp của ảnh",
              },
              observedFeatures: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Các đặc điểm hình thái cụ thể nhìn thấy trong ảnh phù hợp với loài này (hình dạng lá, mép lá, gân lá, thân, gai, màu hoa...)",
              },
              habitatInCentralVietnam: {
                type: Type.STRING,
                description: "Mô tả sinh cảnh sống tự nhiên thường gặp (vườn nhà, rừng đồi, ven suối, cồn cát, nương rẫy)",
              },
              folkUseSummary: {
                type: Type.STRING,
                description: "Bộ phận dùng và công dụng làm thuốc chủ yếu theo y học cổ truyền và dược lý học",
              },
              distinctionTips: {
                type: Type.STRING,
                description: "Dấu hiệu then chốt để phân biệt chính xác với các loài thực vật tương tự hoặc tránh nhầm lẫn với cây dại khác",
              },
            },
            required: ["vietnameseName", "scientificName", "family", "confidence", "observedFeatures"],
          },
        },
        safetyDisclaimer: {
          type: Type.STRING,
          description: "Khuyến cáo an toàn và đạo đức nghiên cứu dược liệu",
        },
      },
      required: ["summary", "candidates", "safetyDisclaimer"],
    };

    let response;
    let usedModel = "gemini-3.7-flash";

    try {
      response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: effectiveMime,
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
          responseMimeType: "application/json",
          responseSchema,
        },
      });
    } catch (primaryErr: any) {
      console.warn("Primary model gemini-3.7-flash fallback to gemini-2.5-flash:", primaryErr.message);
      usedModel = "gemini-2.5-flash";
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: effectiveMime,
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
          responseMimeType: "application/json",
          responseSchema,
        },
      });
    }

    const responseText = response.text || "{}";
    const parsedData = JSON.parse(responseText);

    return res.status(200).json({
      success: true,
      data: parsedData,
      model: usedModel,
    });
  } catch (error: any) {
    console.error("Vercel AI plant identification error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Lỗi xử lý hình ảnh nhận diện thực vật bằng AI.",
    });
  }
}
