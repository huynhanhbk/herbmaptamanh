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

    const systemInstruction = `Bạn là Chuyên gia Giám định Thực vật học và Dược liệu học hàng đầu Việt Nam, am tường hệ thống phân loại thực vật APG IV, Dược điển Việt Nam V, bộ sách "Những Cây thuốc và Vị thuốc Việt Nam" (GS. Đỗ Tất Lợi), Cây cỏ Việt Nam (GS. Phạm Hoàng Hộ), CSDL Viện Dược liệu và Plants of the World Online (Kew Royal Botanic Gardens).

NHIỆM VỤ CỐT LÕI:
Phân tích chi tiết và khách quan hình thái của bức ảnh thực vật / cây thuốc được cung cấp. Dựa trên các đặc điểm hình thái và giải phẫu có thể quan sát trực tiếp trong ảnh:
1. KIỂU THÂN & DẠNG SỐNG: Thân thảo mọc đứng, thân bò lan mọc rễ ở mấu, thân bụi gỗ, thân leo/quấn/rễ bám, thân vuông 4 góc (đặc trưng họ Hoa môi Lamiaceae / Ô rô Acanthaceae), thân mọng nước (Húng chanh, Sống đời, Nha đam), thân có gai (Cà gai leo, Ngũ gia bì, Dâm bụt), thân củ/thân rễ (Gừng, Nghệ, Ba kích, Sâm cau, Mạch môn).
2. KIỂU LÁ & CÁCH ĐÍNH: Lá đơn mọc cách (so le), lá mọc đối (chéo chữ thập), lá mọc vòng, hay lá mọc chụm ở gốc hình hoa thị (Mã đề, Mạch môn, Sâm cau).
3. HÌNH DẠNG PHIẾN LÁ: Lá hình tim (Lá lốt, Trầu không, Dây thìa canh non), lá hình tròn/thận (Rau má), lá hình mác hẹp/thuôn (Kinh giới, Xuyên tâm liên, Cỏ mực, Sài đất), lá hình trứng/bầu dục (Kim ngân, Ba kích, Tía tô), lá kép lông chim 1-2 lần (Diệp hạ châu, Ngải cứu, Đinh lăng, Muồng trâu), lá kép chân vịt (Ngũ gia bì, Chùm ngây).
4. MÉP LÁ & BỀ MẶT: Mép nguyên, mép răng cưa nhỏ, răng cưa sâu, khía tai bèo tròn (Húng chanh, Rau má), xẻ thùy sâu (Ngải cứu, Cà gai leo). Mặt lá nhẵn bóng, phủ lông ráp nhám tay (Cỏ mực, Sài đất), phủ lông nhung trắng tro mặt dưới (Ngải cứu, Tía tô mặt dưới tím), mặt lá có gai (Cà gai leo).
5. HỆ GÂN LÁ: Gân lông chim, gân chân vịt 5 gân từ gốc (Lá lốt, Trầu không), 3 gân hình cung rõ từ cuống (Chè vằng), gân song song dài (Sâm cau, Mạch môn, Cỏ tranh).
6. HOA & CỤM HOA: Màu hoa (Vàng, Trắng, Tím, Đỏ, Hồng, Xanh lục); Cụm hoa (Hoa đơn độc, chùm nách lá, bông dài thẳng đứng, cụm hoa hình đầu/cúc, tán hoa, hoa hình ống/môi).
7. QUẢ & HẠT: Quả mọng chín đỏ/đen, quả tròn xếp hàng dưới cuống lá (Diệp hạ châu), quả có gai, quả nang, hạt.

QUY TẮC PHÂN LOẠI & ĐÁNH GIÁ:
1. TUYỆT ĐỐI KHÔNG TRẢ VỀ KẾT QUẢ MẶC ĐỊNH HOẶC RẬP KHUÔN. Bất kể là loài cây nào (Lá lốt, Trầu không, Tía tô, Kinh giới, Húng chanh, Ngải cứu, Sài đất, Rau má, Mã đề, Đinh lăng, Xuyên tâm liên, Kim ngân hoa, Chè vằng, Ba kích, Kê huyết đằng, Dây thìa canh, Diệp hạ châu, Cỏ mực, Xạ đen, Hoàn ngọc, Lược vàng, Bồ công anh, Gừng gió, Nghệ vàng, Cỏ mần trầu, Sả chanh, Cà gai leo, Muồng trâu, Cối xay, Dây đau xương...), bạn PHẢI nhận diện chính xác theo đúng hình ảnh thực tế được tải lên.
2. ĐƯA RA ĐÚNG 3 GỢI Ý PHÂN LOẠI XẾP THEO ĐỘ TIN CẬY GIẢM DẦN:
   - Gợi ý 1: Loài cây khớp cao nhất với hình thái trực quan trong ảnh.
   - Gợi ý 2: Loài cây dược liệu tiềm năng thứ hai (cùng họ/cùng chi hoặc có hình thái gần giống).
   - Gợi ý 3: Loài cây tương tự hoặc dễ gây nhầm lẫn để người khảo sát đối chiếu và loại trừ.
3. Phân tích chi tiết từng loài:
   - Tên tiếng Việt phổ thông chính xác kèm tên gọi dân gian/địa phương.
   - Tên khoa học quốc tế đầy đủ (Danh pháp hai phần kèm tác giả).
   - Họ thực vật học (Tên Việt & Latinh).
   - Tỷ lệ tin cậy (%) trung thực theo độ rõ của ảnh.
   - Các đặc điểm hình thái nhìn thấy rõ trong ảnh chứng minh cho nhận định.
   - Phân bố và sinh cảnh tự nhiên (đặc biệt tại miền Trung / Việt Nam).
   - Bộ phận dùng & Công dụng dược liệu chính theo YHCT và Dược lý hiện đại.
   - Dấu hiệu then chốt để phân biệt chính xác với các loài tương tự.`;

    const prompt = `Phân tích toàn diện và tỉ mỉ bức ảnh thực vật này. Hãy quan sát từng chi tiết giải phẫu hình thái: kiểu thân, cách mọc lá, dạng phiến lá, mép lá, hệ gân lá, màu sắc và hoa/quả nếu có. 
Ghi chú bổ sung từ người khảo sát thực địa: "${userNotes || 'Không có ghi chú thêm'}".
Hãy tra cứu và trả về JSON chứa 3 phương án gợi ý cây dược liệu/thực vật chính xác và sát thực tế nhất.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.STRING,
          description: "Mô tả chi tiết và khách quan về các đặc điểm hình thái thực vật quan sát được trực tiếp từ bức ảnh (dạng thân, kiểu lá, gân lá, mép lá, màu sắc, hoa, quả...)",
        },
        candidates: {
          type: Type.ARRAY,
          description: "Danh sách đúng 3 loài cây tiềm năng nhất xếp theo mức độ tin cậy giảm dần",
          items: {
            type: Type.OBJECT,
            properties: {
              vietnameseName: {
                type: Type.STRING,
                description: "Tên tiếng Việt phổ thông chính xác nhất (ví dụ: Lá lốt, Trầu không, Tía tô, Kim ngân hoa, Ba kích, Dây thìa canh, Rau má...)",
              },
              otherNames: {
                type: Type.STRING,
                description: "Tên gọi dân gian hoặc tên gọi địa phương khác nếu có",
              },
              scientificName: {
                type: Type.STRING,
                description: "Tên khoa học quốc tế đầy đủ kèm tên tác giả (ví dụ: Piper sarmentosum Roxb.)",
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
