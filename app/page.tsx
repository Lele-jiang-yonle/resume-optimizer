'use client';

import { useState, useRef } from 'react';

type Stage = 'upload' | 'diagnosing' | 'questions' | 'optimizing' | 'result';

interface DiagnoseItem {
  name: string;
  score: number;
  pain: string[];
  highlight: string[];
  question: string;
}

interface QuestionItem {
  id: number;
  title: string;
  options: string[];
}

export default function Home() {
  // ---- 状态 ----
  const [stage, setStage] = useState<Stage>('upload');
  const [industry, setIndustry] = useState('互联网');
  const [jdText, setJdText] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [diagnosisItems, setDiagnosisItems] = useState<DiagnoseItem[]>([]);
  const [questionItems, setQuestionItems] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- 处理文件上传 ----
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeFileName(file.name);
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setResumeText(result.value);
  };

  // ---- 开始诊断 ----
  const startDiagnosis = async () => {
    if (!resumeText || !jdText.trim()) {
      alert('请上传简历并填写职位描述 (JD)');
      return;
    }
    setLoading(true);
    setStage('diagnosing');

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jdText, industry }),
      });
      const data = await res.json();
      const content = data.content;

      if (content.diagnosis && content.questions) {
        setDiagnosisItems(content.diagnosis);
        setQuestionItems(content.questions);
        setStage('questions');
      } else {
        throw new Error('返回数据格式错误');
      }
    } catch (err) {
      alert('诊断失败：' + (err as Error).message);
      setStage('upload');
    }
    setLoading(false);
  };

  // ---- 生成优化版简历 ----
  const submitAnswers = async () => {
    setLoading(true);
    setStage('optimizing');

    const answersText = questionItems.map(q => {
      const choice = answers[String(q.id)];
      const custom = answers[String(q.id) + '_D'];
      if (custom && custom.trim()) {
        return `问题${q.id}: D. ${custom}`;
      }
      return `问题${q.id}: ${choice || '未选择'}`;
    }).join('\n');

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jdText, industry, answers: answersText }),
      });
      const data = await res.json();
      setResult(data.content);
      setStage('result');
    } catch (err) {
      alert('生成失败，请重试');
      setStage('questions');
    }
    setLoading(false);
  };

  // ---- 重置 ----
  const reset = () => {
    setStage('upload');
    setDiagnosisItems([]);
    setQuestionItems([]);
    setAnswers({});
    setResult('');
    setResumeFileName('');
  };

  // ---- 获取步骤样式 ----
  const getStepClass = (stepNum: number) => {
    if (stage === 'result' && stepNum < 3) return 'step done';
    const stageToStep: Record<Stage, number> = {
      upload: 1, diagnosing: 1, questions: 2, optimizing: 2, result: 3,
    };
    const currentStep = stageToStep[stage];
    if (stepNum === currentStep) return 'step active';
    if (stepNum < currentStep) return 'step done';
    return 'step';
  };

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      background: '#f5f7fa', display: 'flex', justifyContent: 'center', padding: '24px', minHeight: '100vh',
    }}>
      <div style={{
        maxWidth: '1100px', width: '100%', background: '#fff', borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)', overflow: 'hidden',
      }}>
        {/* ========== 头部 ========== */}
        <div style={{ padding: '28px 36px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📝 <span style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>简历优化助手</span>
          </div>
        </div>

        {/* ========== 步骤指示器 ========== */}
        <div style={{ display: 'flex', gap: '28px', padding: '20px 36px', borderBottom: '1px solid #f1f5f9' }}>
          {['上传诊断', '互动提问', '优化结果'].map((label, i) => (
            <div key={i} className={getStepClass(i + 1)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
              color: getStepClass(i + 1).includes('active') ? '#3b82f6' : getStepClass(i + 1).includes('done') ? '#10b981' : '#94a3b8',
              fontWeight: 500,
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                background: getStepClass(i + 1).includes('active') ? '#3b82f6' : getStepClass(i + 1).includes('done') ? '#10b981' : '#f1f5f9',
                color: getStepClass(i + 1).includes('active') || getStepClass(i + 1).includes('done') ? '#fff' : '#64748b',
              }}>{i + 1}</div>
              {label}
            </div>
          ))}
        </div>

        {/* ========== 主体内容 ========== */}
        <div style={{ display: 'flex', minHeight: '520px' }}>
          {/* ===== 左侧边栏 ===== */}
          <div style={{ width: '380px', padding: '28px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 阶段一：上传 */}
            {(stage === 'upload' || stage === 'diagnosing') && (
              <>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>📎 上传简历</label>
                <div onClick={() => fileInputRef.current?.click()} style={{
                  border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '28px',
                  textAlign: 'center', cursor: 'pointer', background: '#fafbfc',
                }}>
                  {resumeFileName ? (
                    <>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>简历已选择：{resumeFileName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>点击重新选择</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>点击或将文件拖拽至此</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>支持 .docx，最大10MB</div>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileChange} style={{ display: 'none' }} />

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>🎯 目标行业</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                }}>
                  <option>互联网</option>
                  <option>央国企</option>
                  <option>外企</option>
                </select>

                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>📋 职位描述 (JD)</label>
                <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={6} placeholder="粘贴目标岗位的完整职位描述..." style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                }} />

                <button onClick={startDiagnosis} disabled={loading} style={{
                  width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: '#fff', opacity: loading ? 0.4 : 1, cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                  {loading ? '⏳ 分析中...' : '🚀 开始诊断'}
                </button>
              </>
            )}

            {/* 阶段二：回答问题 */}
            {stage === 'questions' && (
              <>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>💬 你的回答</label>
                <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '12px', color: '#64748b' }}>
                  {questionItems.map(q => (
                    <div key={q.id} style={{ marginBottom: '4px' }}>
                      问题{q.id}: <span style={{ color: answers[q.id + '_D'] ? '#10b981' : answers[q.id] ? '#10b981' : '#3b82f6' }}>
                        {answers[q.id + '_D'] ? `D. ${answers[q.id + '_D']}` : answers[q.id] || '待选择'}
                      </span>
                    </div>
                  ))}
                </div>

                <button onClick={submitAnswers} disabled={loading} style={{
                  width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', marginTop: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                }}>
                  ✨ 生成优化版简历
                </button>
                <button onClick={reset} style={{
                  width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600, background: '#f1f5f9', color: '#475569',
                  marginTop: '4px', cursor: 'pointer',
                }}>
                  ← 返回重新上传
                </button>
              </>
            )}

            {/* 优化中 */}
            {stage === 'optimizing' && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
                <p>正在生成优化版简历...</p>
              </div>
            )}

            {/* 阶段三：结果完成后 */}
            {stage === 'result' && (
              <button onClick={reset} style={{
                width: '100%', padding: '12px', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600, background: '#f1f5f9', color: '#475569', cursor: 'pointer',
              }}>
                🔄 优化另一份简历
              </button>
            )}
          </div>

          {/* ===== 右侧预览区 ===== */}
          <div style={{ flex: 1, padding: '28px', overflowY: 'auto', maxHeight: '600px' }}>
            {/* 空状态 */}
            {(stage === 'upload' || stage === 'diagnosing') && (
              <div>
                <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '12px' }}>👋 欢迎使用</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>
                  上传简历并粘贴 JD，AI 将为你进行五维度诊断，并通过互动提问生成高度匹配的优化版简历。
                </p>
              </div>
            )}

            {/* 诊断报告 */}
            {stage === 'questions' && diagnosisItems.length > 0 && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '12px' }}>📊 深度诊断报告</h3>
                {diagnosisItems.map((item, idx) => (
                  <div key={idx} style={{
                    background: '#fafbfc', borderRadius: '12px', padding: '20px',
                    marginBottom: '14px', border: '1px solid #f1f5f9',
                  }}>
                    <h4 style={{ fontSize: '14px', color: '#3b82f6', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{idx + 1}. {item.name}</span>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '11px', fontWeight: 600,
                        background: item.score >= 75 ? '#d1fae5' : item.score >= 50 ? '#fef3c7' : '#fee2e2',
                        color: item.score >= 75 ? '#065f46' : item.score >= 50 ? '#92400e' : '#991b1b',
                      }}>{item.score}%</span>
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '4px', width: `${item.score}%`,
                          background: item.score >= 75 ? '#10b981' : item.score >= 50 ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{item.score}%</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                      <p><strong>✅ 亮点：</strong>{item.highlight.join('；')}</p>
                      <p><strong>⚠️ 痛点：</strong>{item.pain.join('；')}</p>
                      <p><strong>❓ 待挖掘：</strong>{item.question}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 提问区 */}
            {stage === 'questions' && questionItems.length > 0 && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '12px' }}>💡 关键信息确认</h3>
                {questionItems.map((qItem) => (
                  <div key={qItem.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                      问题{qItem.id}：{qItem.title}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {qItem.options.map((opt, i) => {
                        const optLetter = String.fromCharCode(65 + i);
                        const isInputOption = optLetter === 'D' || opt.includes('其他');
                        const optText = opt.replace(/^[A-D]\.\s*/, '').trim();

                        if (isInputOption) {
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>{optLetter}.</span>
                              <input
                                type="text"
                                placeholder="请补充..."
                                value={answers[String(qItem.id) + '_D'] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAnswers(prev => ({ ...prev, [String(qItem.id) + '_D']: val }));
                                  if (val.trim()) {
                                    setAnswers(prev => ({ ...prev, [String(qItem.id)]: `D. ${val}` }));
                                  } else {
                                    setAnswers(prev => {
                                      const newAns = { ...prev };
                                      delete newAns[String(qItem.id)];
                                      return newAns;
                                    });
                                  }
                                }}
                                style={{ flex: 1, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                              />
                            </div>
                          );
                        }

                        return (
                          <div
                            key={i}
                            onClick={() => {
                              setAnswers(prev => ({ ...prev, [String(qItem.id)]: optLetter }));
                              setAnswers(prev => {
                                const newAns = { ...prev };
                                delete newAns[String(qItem.id) + '_D'];
                                return newAns;
                              });
                            }}
                            style={{
                              padding: '6px 14px',
                              border: `1px solid ${answers[String(qItem.id)] === optLetter ? '#3b82f6' : '#e2e8f0'}`,
                              borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                              background: answers[String(qItem.id)] === optLetter ? '#3b82f6' : '#fff',
                              color: answers[String(qItem.id)] === optLetter ? '#fff' : '#334155',
                            }}
                          >
                            {optLetter}. {optText}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 优化结果 - 对比展示 */}
            {stage === 'result' && result && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <h3 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '12px' }}>✨ 优化结果对比</h3>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{
                    flex: 1, background: '#fafbfc', borderRadius: '12px', padding: '16px',
                    border: '1px solid #f1f5f9', maxHeight: '500px', overflowY: 'auto',
                  }}>
                    <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>📋 原始版本</h4>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                      {result.split('【优化版简历】')[0]?.replace('【原始版本备份区】', '').trim() || '暂无原始版本'}
                    </div>
                  </div>
                  <div style={{
                    flex: 1, background: '#f0f9ff', borderRadius: '12px', padding: '16px',
                    border: '1px solid #bae6fd', maxHeight: '500px', overflowY: 'auto',
                  }}>
                    <h4 style={{ fontSize: '14px', color: '#0369a1', marginBottom: '8px' }}>✨ 优化版本</h4>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#0c4a6e', lineHeight: 1.6 }}>
                      {result.split('【优化版简历】')[1]?.trim() || '暂无优化版本'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading {
          0% { width: 20%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}