"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = exports.deleteQuestion = exports.addQuestion = void 0;
const index_js_1 = require("../container/index.js");
const addQuestion = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { roomId } = req.params;
    const { questionText, options, correctAnswerIndex, imageUrl } = req.body;
    if (!questionText || !options || correctAnswerIndex === undefined) {
        res.status(400).json({ success: false, message: 'Missing required fields' });
        return;
    }
    try {
        const svc = index_js_1.container.questionService;
        const userId = req.user.id;
        const result = await svc.addQuestion(Number(roomId), userId, String(questionText), options, Number(correctAnswerIndex), imageUrl);
        if (result.notFound) {
            res.status(404).json({ success: false, message: 'Room not found' });
            return;
        }
        if (result.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized to edit this room' });
            return;
        }
        res.status(201).json({
            success: true,
            message: 'Question added',
            question: {
                id: result.id,
                questionText,
                options,
                correctAnswerIndex,
                orderIndex: undefined,
                imageUrl: imageUrl || null
            }
        });
    }
    catch (error) {
        console.error('Add Question Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.addQuestion = addQuestion;
const deleteQuestion = async (req, res) => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const { id } = req.params;
    try {
        const svc = index_js_1.container.questionService;
        const resDel = await svc.deleteQuestionByIdWithOwnership(Number(id), req.user.id);
        if (resDel.notFound) {
            res.status(404).json({ success: false, message: 'Question not found' });
            return;
        }
        if (resDel.forbidden) {
            res.status(403).json({ success: false, message: 'Not authorized' });
            return;
        }
        res.json({ success: true, message: 'Question deleted' });
    }
    catch (error) {
        console.error('Delete Question Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.deleteQuestion = deleteQuestion;
const getQuestions = async (req, res) => {
    const { roomId } = req.params;
    try {
        const svc = index_js_1.container.questionService;
        const questions = await svc.getQuestions(Number(roomId));
        const parsedQuestions = questions.map((q) => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
        res.json({ success: true, questions: parsedQuestions });
    }
    catch (error) {
        console.error('Get Questions Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getQuestions = getQuestions;
