import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `
你是资深简历诊断专家。请根据上传的简历和职位描述，输出一份严格的 JSON 对象。
JSON 结构必须如下：
{
  "diagnosis": [
    {
      "name": "JD匹配度",
      "score": 75,
      "pain": ["痛点1", "痛点2"],
      "highlight": ["亮点1", "亮点2"],
      "question": "待挖掘疑点描述"
    }
    // 五个维度：JD匹配度、量化成果、结构逻辑、语言专业度、ATS友好度
  ],
  "questions": [
    {
      "id": 1,
      "title": "清晰的题干",
      "options": ["A. 选项描述", "B. 选项描述", "C. 选项描述", "D. 其他（请具体说明）"]
    }
    // 3~5个问题
  ]
}

**关键要求**：
- 选项 D 必须为“D. 其他（请具体说明）”或类似开放式填空提示，**不要预设内容**。
- 问题数量严格3~5个，每个问题选项固定4个，D为开放式填空。
- 输出必须是纯净的 JSON，不要包含任何解释文字或代码块标记。
`;

export async function POST(req: NextRequest) {
  // 延迟初始化，保证运行时才读取环境变量
  const client = new OpenAI({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });

  const { resumeText, jdText, industry } = await req.json();
  const userMessage = `行业风格：${industry}\n\n【职位描述】\n${jdText}\n\n【我的简历】\n${resumeText}`;

  try {
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('模型未返回有效的响应内容。');
    }
    console.log('Diagnose raw output:', content);

    // 提取 JSON：找第一个 { 和最后一个 } 之间的内容
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('模型未返回有效的 JSON 对象。原始输出: ' + content);
    }
    const jsonString = content.slice(jsonStart, jsonEnd + 1);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      throw new Error('JSON 解析失败。提取的字符串: ' + jsonString);
    }

    if (!parsed.diagnosis || !parsed.questions) {
      throw new Error('JSON 缺少 diagnosis 或 questions 字段。解析结果: ' + JSON.stringify(parsed));
    }

    return NextResponse.json({ content: parsed });
  } catch (error: any) {
    console.error('Diagnose API Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}