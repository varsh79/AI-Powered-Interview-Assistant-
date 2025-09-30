import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Input, Form, Progress, List, Modal } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrent, updateCurrent, clearCurrent } from '../slices/currentSlice';
import { addCandidate } from '../slices/candidatesSlice';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjs from 'pdfjs-dist/webpack';
import { callGeminiAPI } from '../utils/api';

const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
const timers = [20, 20, 60, 60, 120, 120];

function IntervieweeTab() {
  const dispatch = useDispatch();
  const current = useSelector((state) => state.current);

  const [step, setStep] = useState(current?.step || 'upload');
  const [resumeText, setResumeText] = useState('');
  const [profile, setProfile] = useState(current?.profile || { name: '', email: '', phone: '' });
  const [missingFields, setMissingFields] = useState([]);
  const [chatMessages, setChatMessages] = useState(current?.chatMessages || []);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(current?.currentQuestionIndex || 0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(timers[0] || 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [questions, setQuestions] = useState(current?.questions || []);
  const [answers, setAnswers] = useState(current?.answers || []);
  const [scores, setScores] = useState(current?.scores || []);
  const fileInputRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef(null);

  // ---------- Validation ----------
  const validateEmail = (s) =>
    typeof s === 'string' && s.includes('@') && s.indexOf('@') > 0 && s.indexOf('@') < s.length - 1;

  // Phone must contain exactly 10 digits for the national number (last 10 digits). Country code allowed.
  const validatePhone = (s) => {
    if (typeof s !== 'string') return false;
    const digitsOnly = s.replace(/\D/g, '');
    if (digitsOnly.length < 10) return false;
    const national = digitsOnly.slice(-10);
    return /^\d{10}$/.test(national);
  };

  // ---------- AI call with timeout + retries ----------
  const aiCall = async (prompt, { timeoutMs = 12000, retries = 2 } = {}) => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await Promise.race([
          callGeminiAPI(prompt),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI timeout')), timeoutMs)),
        ]);
        if (res && typeof res === 'string' && res.trim()) return res.trim();
        throw new Error('AI empty response');
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('AI failed');
  };

  // ---------- Skill Templates (difficulty-stratified) ----------
  const SKILL_TEMPLATES = {
    javascript: {
      easy: [
        'What does const do in JavaScript, and when would you use it?',
        'Explain the difference between == and === with a small example.',
        'How would you debounce a button click handler conceptually?',
      ],
      medium: [
        'When would you prefer map/filter/reduce over for loops? Give a quick example.',
        'How do closures work and where have you used them practically?',
        'Describe how you would structure a small utility module and import it.',
      ],
      hard: [
        'Explain the event loop and microtasks using a short example.',
        'How would you profile and optimize JS code that blocks the UI thread?',
        'Discuss tradeoffs between immutability and performance in JS data handling.',
      ],
    },
    typescript: {
      easy: [
        'Why use TypeScript over JavaScript in a small project?',
        'What is an interface in TypeScript?',
      ],
      medium: [
        'Explain generics in TypeScript with a short example.',
        'How do you narrow union types when handling API responses?',
      ],
      hard: [
        'Discuss designing a type-safe API client and error types in TypeScript.',
        'How would you enforce domain constraints using TS types?',
      ],
    },
    react: {
      easy: [
        'How do you update state for a counter in a React component?',
        'What is the purpose of useEffect with an empty dependency array?',
        'How would you fetch data in React and show a loading state?',
      ],
      medium: [
        'Explain lifting state up and when you’d use Context.',
        'What is memoization in React (React.memo/useMemo)? When is it helpful?',
        'How do you manage forms and validation in React?',
      ],
      hard: [
        'Describe a strategy to optimize re-renders in a large React tree.',
        'How would you implement error boundaries and why?',
        'Discuss code-splitting and lazy loading routes/components.',
      ],
    },
    node: {
      easy: [
        'What is Express and when would you use it?',
        'Show how you would define a simple GET route in Express (conceptually).',
      ],
      medium: [
        'How would you structure a basic Express API with one protected route?',
        'Explain middleware in Express and give a use case.',
      ],
      hard: [
        'How would you implement rate limiting and why?',
        'Discuss scaling a Node API: clustering, statelessness, and caching.',
      ],
    },
    python: {
      easy: [
        'Describe one way to optimize a slow Python loop.',
        'What are list comprehensions and when would you use them?',
      ],
      medium: [
        'Explain virtual environments and dependency management briefly.',
        'How would you structure a small Python package with modules?',
      ],
      hard: [
        'How would you profile Python code for hotspots and optimize them?',
        'Discuss async in Python (asyncio) and an example use case.',
      ],
    },
    django: {
      easy: [
        'How do you create a basic Django model and run a migration?',
        'What are Django templates used for?',
      ],
      medium: [
        'Explain the Django ORM and a simple filter query example.',
        'How do you add authentication to a Django app?',
      ],
      hard: [
        'How would you scale a Django app (caching, DB tuning, static/media)?',
        'Discuss DRF viewsets vs function-based views trade-offs.',
      ],
    },
    flask: {
      easy: [
        'How do you define a simple Flask route that returns JSON?',
        'What is the purpose of app.run in Flask?',
      ],
      medium: [
        'How would you organize a medium-sized Flask app (blueprints)?',
        'Explain request context and when you need it.',
      ],
      hard: [
        'How would you add JWT auth and rate limiting to a Flask API?',
        'Discuss production deployment of Flask (WSGI, Gunicorn, Nginx).',
      ],
    },
    sql: {
      easy: [
        'How do you create a basic SQL table for users (id, name, email)?',
        'Write a simple SELECT * FROM users WHERE email LIKE %@example.com.',
      ],
      medium: [
        'Explain an index and when you would add one.',
        'How do you write a JOIN between users and orders? Give a quick example.',
      ],
      hard: [
        'How would you analyze and optimize a slow SQL query (EXPLAIN, indexes)?',
        'Discuss normalization vs denormalization trade-offs.',
      ],
    },
    postgres: {
      easy: [
        'What is a serial/identity column in Postgres?',
      ],
      medium: [
        'How would you store JSON data and query it in Postgres?',
      ],
      hard: [
        'Discuss Postgres transactions and isolation levels briefly.',
      ],
    },
    mysql: {
      easy: ['What storage engines are you familiar with in MySQL?'],
      medium: ['How would you design a simple MySQL schema for products and orders?'],
      hard: ['Discuss deadlocks and how you’d detect/avoid them in MySQL.'],
    },
    mongodb: {
      easy: [
        'How would you design a simple user document in MongoDB?',
        'What is a collection vs a document?',
      ],
      medium: [
        'Explain indexing in MongoDB and when to use compound indexes.',
        'When would you embed vs reference documents?',
      ],
      hard: [
        'Discuss schema design for high-write workloads and shard keys.',
        'How would you handle large aggregations efficiently?',
      ],
    },
    aws: {
      easy: [
        'When would you use S3 vs EC2 at a high level?',
        'What is the purpose of IAM roles?',
      ],
      medium: [
        'How would you deploy a small Node.js API to AWS (at a high level)?',
        'Explain using RDS vs DynamoDB trade-offs briefly.',
      ],
      hard: [
        'Discuss designing a simple, fault-tolerant architecture on AWS with autoscaling.',
        'How would you add observability (logs/metrics/traces) on AWS?',
      ],
    },
    docker: {
      easy: [
        'What is a Dockerfile and why would you use it for a small app?',
        'What is the difference between an image and a container?',
      ],
      medium: [
        'How would you write a minimal Dockerfile for a Node app?',
        'What is multi-stage build and why use it?',
      ],
      hard: [
        'Discuss container orchestration basics and when you’d move to Kubernetes.',
        'How would you secure images and manage secrets?',
      ],
    },
    git: {
      easy: ['What is the difference between git pull and git fetch?', 'How do you resolve a simple merge conflict?'],
      medium: ['Explain branching strategy you used (e.g., GitFlow).', 'How do you cherry-pick and when is it useful?'],
      hard: ['How would you design CI/CD triggers around branches and PRs?'],
    },
    testing: {
      easy: [
        'What is the difference between unit and integration tests?',
        'How would you test a simple pure function?',
      ],
      medium: [
        'How would you test a React component that fetches data?',
        'Explain mocking dependencies in Node/JS tests.',
      ],
      hard: [
        'Discuss test flakiness and strategies to reduce it.',
        'How do you measure and act on code coverage meaningfully?',
      ],
    },
    htmlcss: {
      easy: [
        'How would you center a div both vertically and horizontally (conceptually)?',
        'What is the difference between margin and padding?',
      ],
      medium: [
        'Explain CSS specificity briefly.',
        'How would you structure responsive layouts (flex/grid)?',
      ],
      hard: [
        'Discuss performance considerations for large CSS codebases.',
        'How would you build accessible components (ARIA basics)?',
      ],
    },
  };

  // ---------- Seeding & Helpers for deterministic randomness ----------
  const hashString = (s) => {
    // djb2
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h) >>> 0;
  };

  const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  const pickRandom = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  const shuffleInPlace = (arr, rng) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Detect skills by scanning text (very light-weight)
  const detectSkills = (txt) => {
    const t = (txt || '').toLowerCase();
    const skills = [];
    const maybe = [
      ['javascript', ['javascript', ' js ', 'ecmascript']],
      ['typescript', ['typescript', ' ts ']],
      ['react', ['react']],
      ['node', ['node', 'express']],
      ['python', ['python']],
      ['django', ['django']],
      ['flask', ['flask']],
      ['sql', [' sql ', 'postgres', 'mysql', 'sqlite']],
      ['postgres', ['postgres', 'postgresql']],
      ['mysql', ['mysql']],
      ['mongodb', ['mongodb', 'mongo']],
      ['aws', ['aws', 's3', 'ec2', 'lambda', 'rds']],
      ['docker', ['docker', 'container']],
      ['git', ['git']],
      ['testing', ['jest', 'mocha', 'pytest', 'testing']],
      ['htmlcss', ['html', 'css', 'tailwind', 'bootstrap']],
    ];
    for (const [key, needles] of maybe) {
      if (needles.some((n) => t.includes(n))) skills.push(key);
    }
    // Ensure at least some defaults if nothing detected
    if (skills.length === 0) skills.push('javascript', 'react', 'node');
    return skills;
  };

  // Build 6 questions aligned to difficulties using templates + seeded randomness
  const buildSkillBasedQuestions = (txt, seed) => {
    const skills = detectSkills(txt);
    const rng = mulberry32(seed);
    const out = [];

    // For each required difficulty, pick a skill and then a question from that skill bucket
    for (const diff of difficulties) {
      // Prefer a random skill from the detected list which has templates for this diff
      const skillsWithDiff = skills.filter((s) => SKILL_TEMPLATES[s] && SKILL_TEMPLATES[s][diff] && SKILL_TEMPLATES[s][diff].length);
      let q = null;

      if (skillsWithDiff.length > 0) {
        const skill = pickRandom(skillsWithDiff, rng);
        const bucket = SKILL_TEMPLATES[skill][diff];
        q = pickRandom(bucket, rng);
      } else {
        // Fallback to any skill in the template map with this difficulty
        const anySkills = Object.keys(SKILL_TEMPLATES).filter((s) => SKILL_TEMPLATES[s][diff]?.length);
        if (anySkills.length > 0) {
          const skill = pickRandom(anySkills, rng);
          const bucket = SKILL_TEMPLATES[skill][diff];
          q = pickRandom(bucket, rng);
        }
      }

      // As a last resort (should not happen), generic difficulty-based fallback
      if (!q) {
        if (diff === 'easy') q = 'Explain a simple bug you recently fixed in your stack.';
        else if (diff === 'medium') q = 'How would you structure a small feature end-to-end in your stack?';
        else q = 'Discuss how you would scale a core part of your application and the trade-offs.';
      }

      out.push(q);
    }

    // De-duplicate while keeping order; if we lost some due to dupes, fill from any pool
    const seen = new Set();
    const unique = out.filter((q) => {
      const k = q.toLowerCase().trim();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    while (unique.length < 6) {
      // Add any random medium question from any skill
      const anySkills = Object.keys(SKILL_TEMPLATES).filter((s) => SKILL_TEMPLATES[s].medium?.length);
      if (anySkills.length === 0) break;
      const s = pickRandom(anySkills, rng);
      const q = pickRandom(SKILL_TEMPLATES[s].medium, rng);
      const k = q.toLowerCase().trim();
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(q);
      }
    }

    // Shuffle lightly so not always [2 easy, 2 medium, 2 hard] fixed order
    return shuffleInPlace(unique.slice(0, 6), rng);
  };

  // ---------- Restore in-progress interview ----------
  useEffect(() => {
    if (current && !isInitialized && !current.finished && current.step === 'interview') {
      Modal.info({
        title: 'Welcome Back',
        content: 'Your previous interview session has been restored.',
      });
      setIsInitialized(true);
      setStep('interview');

      setProfile(current.profile || { name: '', email: '', phone: '' });
      setChatMessages(current.chatMessages || []);
      setQuestions(current.questions || []);
      setAnswers(current.answers || []);
      setScores(current.scores || []);

      const safeIdx = current.currentQuestionIndex ?? 0;
      setCurrentQuestionIndex(safeIdx);

      const tl = timers[safeIdx] ?? 0;
      setTimeLeft(tl);

      const qlist = current.questions || [];
      if (qlist.length > 0 && safeIdx < qlist.length) {
        startQuestion(safeIdx, qlist);
      } else {
        // self-heal: rebuild questions and continue instead of ending/resetting
        const seed = hashString((resumeText || '') + (current.id || 'restore'));
        const rebuilt = buildSkillBasedQuestions(resumeText || '', seed);
        setQuestions(rebuilt);
        updateAndSaveCurrent({ questions: rebuilt, currentQuestionIndex: 0 });
        startQuestion(0, rebuilt);
      }
    }
  }, [current, isInitialized]);

  // ---------- Timer ----------
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    } else if (timeLeft === 0 && timerRunning) {
      handleSubmitAnswer(true);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timeLeft]);

  const updateAndSaveCurrent = (updates) => dispatch(updateCurrent(updates));

  // ---------- Upload / Text handling ----------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (
      !(
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ) {
      message.error('Please upload a PDF or DOCX file.');
      return;
    }

    try {
      const text = await extractText(file);
      setResumeText(text || '');

      const extracted = await extractProfileWithAI(text || '');
      setProfile(extracted);

      const missing = ['name', 'email', 'phone'].filter((f) => !(extracted[f] || '').trim());
      setMissingFields(missing);

      if (missing.length > 0) {
        setStep('collect');
        addChatMessage('bot', `Please provide your ${missing[0]}.`);
      } else {
        startInterview(extracted, text || '');
      }
    } catch (err) {
      console.error('Upload error:', err);
      message.error('File processing failed. Try another file or paste your resume text.');
      setStep('upload');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmitResumeText = async () => {
    if (!resumeText.trim()) {
      message.error('Please enter some resume text (or upload a file).');
      return;
    }
    try {
      const extracted = await extractProfileWithAI(resumeText);
      setProfile(extracted);

      const missing = ['name', 'email', 'phone'].filter((f) => !(extracted[f] || '').trim());
      setMissingFields(missing);

      if (missing.length > 0) {
        setStep('collect');
        addChatMessage('bot', `Please provide your ${missing[0]}.`);
      } else {
        startInterview(extracted, resumeText);
      }
    } catch (err) {
      console.error(err);
      message.error('Processing failed. Please try again.');
    }
  };

  const extractText = async (file) => {
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const typedArray = new Uint8Array(e.target.result);
            const pdf = await pdfjs.getDocument(typedArray).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageText = content.items.map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ');
              text += pageText + '\n';
            }
            resolve(text.trim());
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Simplified: for richer DOCX parsing, use mammoth
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target.result || '').toString());
        reader.readAsText(file);
      });
    }
    return '';
  };

  const extractProfileWithAI = async (text) => {
    const prompt = `[INST]Extract name, email, and phone number from the following resume text. Respond only with valid JSON: {"name": "", "email": "", "phone": ""}. If any field is missing, leave it empty. Text: ${text.slice(0, 3000)}[/INST]`;
    try {
      const response = await aiCall(prompt);
      const parsed = JSON.parse(response);
      return { name: parsed.name || '', email: parsed.email || '', phone: parsed.phone || '' };
    } catch {
      message.warning('AI extraction failed, using empty profile.');
      return { name: '', email: '', phone: '' };
    }
  };

  // ---------- Collect missing fields (validated) ----------
  const collectField = (field, rawValue) => {
    const value = (rawValue || '').trim();

    if (field === 'email' && !validateEmail(value)) {
      message.error('Please enter a valid email address containing "@"');
      return;
    }
    if (field === 'phone' && !validatePhone(value)) {
      message.error('Phone must be exactly 10 digits for the national number. Country code like +91 is allowed.');
      return;
    }

    const newProfile = { ...profile, [field]: value };
    setProfile(newProfile);
    const newMissing = missingFields.filter((f) => f !== field);
    setMissingFields(newMissing);
    addChatMessage('user', value);

    if (newMissing.length > 0) {
      addChatMessage('bot', `Please provide your ${newMissing[0]}.`);
    } else {
      startInterview(newProfile, resumeText || '');
    }
  };

  // ---------- Interview flow ----------
  const startInterview = async (prof, resumeTextStr) => {
    const id = uuidv4();
    const newCurrent = {
      id,
      profile: prof,
      questions: [],
      answers: [],
      scores: [],
      chatMessages: [],
      currentQuestionIndex: 0,
      step: 'interview',
      finished: false,
    };

    dispatch(setCurrent(newCurrent));
    setStep('interview');
    setChatMessages([]);
    addChatMessage('bot', 'Interview starting with 6 resume-based questions...');

    // Try AI; if it fails in any way, recover with skill-based generator (seeded with resume+session)
    let qs = [];
    try {
      qs = await generateQuestions(resumeTextStr || '');
    } catch {
      qs = [];
    }
    if (!qs || qs.length !== 6) {
      const seed = hashString((resumeTextStr || '') + id);
      qs = buildSkillBasedQuestions(resumeTextStr || '', seed);
      message.warning('Using skill-based questions (AI unavailable).');
    }

    setQuestions(qs);
    updateAndSaveCurrent({ questions: qs });
    startQuestion(0, qs); // Pass fresh list to avoid stale state
  };

  const generateQuestions = async (resumeTextStr) => {
    const qs = [];
    for (let i = 0; i < 6; i++) {
      const diff = difficulties[i];
      const prompt = `[INST]Generate ONE ${diff} interview question for a full stack developer based ONLY on this resume text: ${resumeTextStr.slice(
        0,
        3000
      )}. Keep it unique and simple. Output only the question text, no quotes.[/INST]`;
      let q = await aiCall(prompt);
      q = (q || '').trim().replace(/(^"|"$)/g, '');
      if (!q || q.length < 5) throw new Error('Question too short');
      qs.push(q);
    }
    // de-dupe; must end with exactly 6
    const seen = new Set();
    const uniq = [];
    for (const q of qs) {
      const k = q.toLowerCase().trim();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(q);
      }
    }
    if (uniq.length !== 6) throw new Error('Duplicate questions detected');
    return uniq;
  };

  // Accept optional override to avoid stale local state
  const startQuestion = (index, qsOverride) => {
    const list = qsOverride || questions;

    // self-heal if missing/short list
    if (!Array.isArray(list) || list.length < 6) {
      const seed = hashString((resumeText || '') + (current?.id || 'fallback'));
      const rebuilt = buildSkillBasedQuestions(resumeText || '', seed);
      setQuestions(rebuilt);
      updateAndSaveCurrent({ questions: rebuilt });
      return startQuestion(index, rebuilt);
    }

    if (index >= list.length) return finishInterview();

    const q = list[index];
    if (!q) {
      const seed = hashString((resumeText || '') + (current?.id || 'fallback2'));
      const rebuilt = buildSkillBasedQuestions(resumeText || '', seed);
      setQuestions(rebuilt);
      updateAndSaveCurrent({ questions: rebuilt });
      return startQuestion(index, rebuilt);
    }

    addChatMessage('bot', q);
    setCurrentQuestionIndex(index);
    updateAndSaveCurrent({ currentQuestionIndex: index });

    const tl = timers[index] ?? 30;
    setTimeLeft(tl);
    setCurrentAnswer('');
    setTimerRunning(true);
  };

  const handleSubmitAnswer = async (auto = false) => {
    setTimerRunning(false);
    clearInterval(timerRef.current);

    const answer = currentAnswer.trim() || '(Timed out - no answer)';
    addChatMessage('user', answer);

    const q = (questions[currentQuestionIndex] || questions[0] || 'Question');
    const score = await judgeAnswer(q, answer);

    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = answer;
      updateAndSaveCurrent({ answers: next });
      return next;
    });

    setScores((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = score;
      updateAndSaveCurrent({ scores: next });
      return next;
    });

    if (auto) message.warning("Time's up! Submitted automatically.");

    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < 6) {
      startQuestion(nextIdx);
    } else {
      finishInterview();
    }
  };

  const judgeAnswer = async (q, a) => {
    try {
      const prompt = `[INST]Score the candidate's answer to "${q}" from 0-10 (integer) based on relevance and accuracy to the resume context. Output only the number.[/INST]\nAnswer: ${a}`;
      const response = await aiCall(prompt, { timeoutMs: 10000, retries: 1 });
      const num = parseInt((response || '').trim(), 10);
      return Number.isFinite(num) ? Math.min(Math.max(num, 0), 10) : 0;
    } catch {
      return 0;
    }
  };

  const finishInterview = async () => {
    const id = current ? current.id : uuidv4();
    const valid = scores.filter((s) => Number.isFinite(s));
    const denom = valid.length || 1;
    const totalScore = valid.reduce((sum, s) => sum + s, 0) / denom;

    let summary = '';
    try {
      const summaryPrompt = `[INST]Provide a concise summary of the candidate's performance based on their answers. Questions and scores: ${questions
        .map((q, i) => `${q} - ${scores[i] ?? 0}`)
        .join('; ')}. Output only the summary text.[/INST]`;
      summary = (await aiCall(summaryPrompt, { timeoutMs: 10000, retries: 1 })) || '';
      summary = summary.trim();
    } catch {
      summary = 'Interview completed. Summary unavailable.';
    }

    const finishedCandidate = {
      id,
      profile,
      questions,
      answers,
      scores,
      chatMessages: [...chatMessages],
      score: totalScore,
      summary,
      finished: true,
    };

    dispatch(addCandidate(finishedCandidate));
    dispatch(clearCurrent());

    setStep('upload');
    setResumeText('');
    setProfile({ name: '', email: '', phone: '' });
    setMissingFields([]);
    setChatMessages([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setTimeLeft(0);
    setTimerRunning(false);
    setQuestions([]);
    setAnswers([]);
    setScores([]);
    message.success('Interview completed! Upload another resume to continue.');
  };

  const addChatMessage = (sender, text) => {
    setChatMessages((prev) => {
      const newMessages = [...prev, { sender, text }];
      updateAndSaveCurrent({ chatMessages: newMessages });
      return newMessages;
    });
  };

  // ---------- UI ----------
  return (
    <div>
      {step === 'upload' && (
        <div>
          <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current.click()} style={{ marginBottom: '8px' }}>
            Upload PDF or DOCX Resume
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <Input.TextArea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Or paste resume text here (e.g., Name: John Doe\nSkills: React, Node.js)"
            rows={6}
          />
          <Button onClick={handleSubmitResumeText} style={{ marginTop: '8px' }}>
            Submit Resume Text
          </Button>
        </div>
      )}

      {step === 'collect' && missingFields.length > 0 && (
        <Form layout="vertical" onFinish={(vals) => collectField(missingFields[0], vals[missingFields[0]])}>
          <Form.Item
            label={`Provide your ${missingFields[0]}`}
            name={missingFields[0]}
            rules={[
              { required: true, message: `Please enter your ${missingFields[0]}` },
              ...(missingFields[0] === 'email'
                ? [{ validator: (_, v) => (validateEmail(v) ? Promise.resolve() : Promise.reject(new Error('Email must contain "@"')))}]
                : []),
              ...(missingFields[0] === 'phone'
                ? [{ validator: (_, v) => (validatePhone(v) ? Promise.resolve() : Promise.reject(new Error('Phone must be 10 digits (national), country code allowed')))}]
                : []),
            ]}
          >
            <Input
              autoFocus
              placeholder={missingFields[0] === 'phone' ? '+91 9876543210' : missingFields[0] === 'email' ? 'name@example.com' : 'Your answer'}
              onPressEnter={(e) => collectField(missingFields[0], e.target.value)}
            />
          </Form.Item>
          <List
            bordered
            dataSource={chatMessages}
            renderItem={(msg) => (
              <List.Item style={{ justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                <span style={{ background: msg.sender === 'bot' ? '#f0f0f0' : '#d9f7be', padding: '8px', borderRadius: '8px' }}>
                  {msg.text}
                </span>
              </List.Item>
            )}
            style={{ height: '200px', overflowY: 'auto', marginTop: '16px' }}
          />
          <Button type="primary" htmlType="submit">Submit</Button>
        </Form>
      )}

      {step === 'interview' && (
        <div>
          <Progress percent={Math.round((currentQuestionIndex / 6) * 100)} />
          <List
            bordered
            dataSource={chatMessages}
            renderItem={(msg) => (
              <List.Item style={{ justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                <span style={{ background: msg.sender === 'bot' ? '#f0f0f0' : '#d9f7be', padding: '8px', borderRadius: '8px' }}>
                  {msg.text}
                </span>
              </List.Item>
            )}
            style={{ height: '400px', overflowY: 'auto', marginBottom: '16px' }}
          />
          <Input.TextArea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={4}
            disabled={!timerRunning}
          />
          <Button onClick={() => handleSubmitAnswer(false)} disabled={!timerRunning} style={{ marginTop: '8px' }}>
            Submit Answer
          </Button>
          <div style={{ marginTop: '8px' }}>Time remaining: {timeLeft} seconds</div>
        </div>
      )}

      {step === 'finished' && <div>Interview completed successfully. View results in Interviewer tab.</div>}
      {!step && <div>Error: Step not initialized. Check console logs.</div>}
    </div>
  );
}

export default IntervieweeTab;
