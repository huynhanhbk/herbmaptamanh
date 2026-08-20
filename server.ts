import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Initialize Gemini SDK lazily / safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      app: "HerbMap Tam Anh API",
      timestamp: new Date().toISOString(),
    });
  });

  // AI Plant Identification API
  app.post("/api/identify-plant", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", userNotes = "", context = "tam_anh_vietnam" } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Vui lòng cung cấp hình ảnh cây thuốc để nhận diện." });
      }

      // Clean base64 string if data URL prefix exists
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const ai = getGeminiClient();

      const systemInstruction = `Bạn là một Chuyên gia Thực vật học và Dược liệu học hàng đầu Việt Nam, chuyên về hệ thực vật miền Trung và vùng đồi núi, cồn cát, ven suối xã Tam Anh (huyện Núi Thành, tỉnh Quảng Nam).
Nhiệm vụ của bạn là phân tích hình ảnh thực vật do học sinh/người dân/cán bộ khảo sát thực địa gửi lên, đưa ra tối đa 3 gợi ý phân loại chính xác nhất.

RÀNG BUỘC KHOA HỌC & ĐẠO ĐỨC:
1. Luôn đưa ra gợi ý kèm mức độ tin cậy tương đối (0-100%).
2. Nhấn mạnh các đặc điểm hình thái quan sát được (lá, gân lá, hoa, quả, thân, gai).
3. Đề cập đến công dụng dân gian lưu truyền (nếu có) nhưng KÈM CẢNH BÁO không dùng thay thế y khoa.
4. Xác định xem loài này có thường phân bố tại miền Trung / Tam Anh hay không.
5. Luôn nhắc nhở: "Đây là kết quả nhận diện sơ bộ hỗ trợ từ AI, cần đối chiếu với cán bộ thực địa, tài liệu Dược điển Việt Nam hoặc người có kinh nghiệm trước khi sử dụng."`;

      const prompt = `Hãy phân tích bức ảnh này và nhận diện loài cây/cây thuốc. 
Ghi chú bổ sung từ người khảo sát: "${userNotes}".
Hãy trả về JSON theo đúng cấu trúc yêu cầu gồm tối đa 3 phương án gợi ý loài cây phù hợp nhất xếp theo mức độ tin cậy giảm dần.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
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
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "Tóm tắt ngắn gọn về kết quả quan sát hình thái cây trong ảnh",
              },
              candidates: {
                type: Type.ARRAY,
                description: "Danh sách tối đa 3 loài cây tiềm năng",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    vietnameseName: {
                      type: Type.STRING,
                      description: "Tên tiếng Việt phổ thông (ví dụ: Cà gai leo, Mạch môn, Xuyên tâm liên...)",
                    },
                    scientificName: {
                      type: Type.STRING,
                      description: "Tên khoa học quốc tế (in nghiêng, ví dụ: Solanum procumbens Lour.)",
                    },
                    family: {
                      type: Type.STRING,
                      description: "Họ thực vật (ví dụ: Họ Cà - Solanaceae)",
                    },
                    confidence: {
                      type: Type.NUMBER,
                      description: "Mức độ tin cậy từ 0 đến 100 (%)",
                    },
                    observedFeatures: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Các đặc điểm hình thái nhìn thấy trong ảnh phù hợp với loài",
                    },
                    habitatInCentralVietnam: {
                      type: Type.STRING,
                      description: "Mô tả sinh cảnh thường gặp tại miền Trung / Tam Anh",
                    },
                    folkUseSummary: {
                      type: Type.STRING,
                      description: "Tóm lược công dụng dân gian lưu truyền",
                    },
                    distinctionTips: {
                      type: Type.STRING,
                      description: "Cách phân biệt với các loài dễ nhầm lẫn",
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
          },
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsedData,
        model: "gemini-3.7-flash",
      });
    } catch (error: any) {
      console.error("AI plant identification error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Lỗi trong quá trình xử lý nhận diện ảnh AI.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌿 HerbMap Tam Anh Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
