import { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// Util: parse markdown-style bold + newlines
const parseMarkdownBold = (text) => {
    if (typeof text !== "string") return text;
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
};

// Component: Reusable progress bar
const ProgressBar = ({ label, value, max }) => {
    const percent = Math.min(100, (value / max) * 100);
    return (
        <div>
            <div className="text-sm font-medium text-gray-700 mb-1">{label}: {value}</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};

function Chatbot() {
    const { user } = useUser();
    const [patient, setPatient] = useState(null);
    const [messages, setMessages] = useState([
        { text: "Hello! I'm your AI health assistant. How can I help you today?", user: false }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [suggestedQuestions] = useState([
        'How well is my diabetes being managed?',
        'What should I do about my recent HbA1c levels?',
        'What lifestyle changes should I consider?',
        'Should I be worried about my kidney function?'
    ]);

    useEffect(() => {
        if (user?.id) {
            const laravelUrl = import.meta.env.VITE_LARAVEL_URL || "http://localhost:8000";
            fetch(`${laravelUrl}/api/patients/by-user/${user.id}`)
                .then(res => res.json())
                .then(data => setPatient(data))
                .catch(err => console.error("Failed to load patient data:", err));
        }
    }, [user]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        setMessages(prev => [...prev, { text: input, user: true }]);
        setInput("");
        setLoading(true);

        try {
            const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:5000";
            const res = await fetch(`${fastApiUrl}/chatbot-patient-query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patient, query: input })
            });

            const data = await res.json();
            const cleanedText = typeof data.response === 'string'
                ? data.response.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
                : data.response;

            setMessages(prev => [...prev, { text: cleanedText, user: false }]);
        } catch (error) {
            console.error("Error:", error);
            setMessages(prev => [...prev, { text: "⚠️ AI is currently unavailable.", user: false }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestedQuestionClick = (question) => setInput(question);

    return (
        <div className="max-w-7xl mx-auto bg-white text-gray-900 rounded-xl shadow p-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-500 mb-2">
                AI Health Assistant
            </h2>
            <p className="text-gray-600 mb-6">
                Ask questions about your health — our AI considers your current lab data, medication, and risk trends.
            </p>

            <div className="flex gap-6">
                {/* Chat Column */}
                <div className="w-3/4">
                    <div className="flex flex-col space-y-4 mb-4 h-[32rem] overflow-y-auto p-4 rounded-lg bg-gradient-to-b from-white via-blue-50 to-white border">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`p-3 rounded-lg max-w-[70%] whitespace-pre-wrap shadow-sm ${message.user
                                    ? 'bg-blue-500 text-white self-end rounded-br-none'
                                    : 'bg-blue-100 text-gray-800 self-start rounded-bl-none'
                                    }`}
                            >
                                {/* Bot message formatting */}
                                {!message.user ? (
                                    <>
                                        {message.text.includes('##')
                                            ? message.text.split(/##\s+/).slice(1).map((section, secIndex) => {
                                                const [title, ...body] = section.split('\n');
                                                return (
                                                    <div key={secIndex} className="mb-4">
                                                        <p className="font-semibold text-blue-700">{title.trim()}</p>
                                                        <div
                                                            className="text-sm text-gray-800"
                                                            dangerouslySetInnerHTML={{
                                                                __html: parseMarkdownBold(body.join('\n').trim())
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })
                                            : (
                                                <div
                                                    className="text-sm text-gray-800"
                                                    dangerouslySetInnerHTML={{ __html: parseMarkdownBold(message.text) }}
                                                />
                                            )}

                                        {/* Visual Enhancements (only on AI messages if patient data loaded) */}
                                        {patient && messages[index - 1]?.text?.toLowerCase().match(/(how.*doing|health.*status|overview|progress|report)/) && (
                                            <div className="mt-4 space-y-4">
                                                {/* Chart */}
                                                <div className="bg-white p-4 rounded shadow border">
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Therapy Trends</h4>
                                                    <Line
                                                        data={{
                                                            labels: ['Visit 1', 'Visit 2', 'Visit 3'],
                                                            datasets: [
                                                                {
                                                                    label: 'HbA1c (%)',
                                                                    data: [patient.hba1c_1st_visit, patient.hba1c_2nd_visit, patient.hba1c_3rd_visit],
                                                                    borderColor: '#6366f1',
                                                                    backgroundColor: 'rgba(99,102,241,0.2)',
                                                                    tension: 0.4
                                                                },
                                                                {
                                                                    label: 'FVG (mmol/L)',
                                                                    data: [patient.fvg_1, patient.fvg_2, patient.fvg_3],
                                                                    borderColor: '#10b981',
                                                                    backgroundColor: 'rgba(16,185,129,0.2)',
                                                                    tension: 0.4
                                                                },
                                                                {
                                                                    label: 'DDS',
                                                                    data: [patient.dds_1, (patient.dds_1 + patient.dds_3) / 2, patient.dds_3],
                                                                    borderColor: '#a855f7',
                                                                    backgroundColor: 'rgba(216,180,254,0.2)',
                                                                    tension: 0.4,
                                                                    yAxisID: 'y1'
                                                                }
                                                            ]
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            scales: {
                                                                y: { position: 'left', title: { display: true, text: 'HbA1c / FVG' } },
                                                                y1: {
                                                                    position: 'right',
                                                                    grid: { drawOnChartArea: false },
                                                                    title: { display: true, text: 'DDS' }
                                                                }
                                                            },
                                                            plugins: { legend: { position: 'top' } }
                                                        }}
                                                    />
                                                </div>

                                                {/* Progress Bars */}
                                                <div className="space-y-2">
                                                    <ProgressBar label="HbA1c (latest)" value={patient.hba1c_3rd_visit} max={12} />
                                                    <ProgressBar label="FVG (latest)" value={patient.fvg_3} max={15} />
                                                    <ProgressBar label="DDS (latest)" value={patient.dds_3} max={5} />
                                                </div>
                                            </div>
                                        )}

                                    </>
                                ) : (
                                    <p className="text-sm">{message.text}</p>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="self-start flex gap-1 mt-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900 placeholder-gray-500"
                            placeholder="Ask about your health here..."
                            rows="2"
                        />
                        <button
                            onClick={sendMessage}
                            className="absolute right-2 bottom-2 bg-blue-500 text-white p-2 rounded-lg"
                        >
                            <i className="fas fa-paper-plane text-white"></i>
                        </button>
                    </div>
                </div>

                {/* Suggested */}
                <div className="w-1/4 p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Suggested Questions</h3>
                    <div className="space-y-2">
                        {suggestedQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => handleSuggestedQuestionClick(q)}
                                className="w-full px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition text-left"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">About Our AI</h3>
                <p className="text-sm text-blue-700 mb-3">
                    This assistant can explain your results, suggest questions for your doctor, and give tips on managing chronic conditions.
                </p>
                <div className="flex items-center text-sm">
                    <i className="fas fa-shield-alt text-blue-600 mr-2"></i>
                    <span className="text-blue-700">All responses are private and for informational use only</span>
                </div>
            </div>
        </div>
    );
}

export default Chatbot;
