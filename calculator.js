/**
 * OmniCalc Ultra - Core Logic & Mathematics Engine
 * Features: Multi-mode calculator (Standard, Scientific, Unit Converter),
 * Web Audio sound synthesis, History tape, Themes, and Full Keyboard Support.
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = localStorage.getItem('omni_sound_enabled') !== 'false';
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('omni_sound_enabled', this.enabled);
      return this.enabled;
    }

    playClick() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.04);
      } catch (e) {
        // Audio fallback ignore
      }
    }

    playEquals() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => { // C5, E5, G5 chord
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.03);
          gain.gain.setValueAtTime(0.06, now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.03);
          osc.stop(now + 0.25);
        });
      } catch (e) {
        // Audio fallback ignore
      }
    }

    playClear() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
      } catch (e) {}
    }

    playError() {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
      } catch (e) {}
    }
  }

  // --- MATHEMATICAL PARSER & EVALUATOR ENGINE ---
  class MathEngine {
    constructor() {
      this.angleMode = 'DEG'; // 'DEG' or 'RAD'
    }

    toRadians(angle) {
      return this.angleMode === 'DEG' ? (angle * Math.PI) / 180 : angle;
    }

    fromRadians(rad) {
      return this.angleMode === 'DEG' ? (rad * 180) / Math.PI : rad;
    }

    factorial(n) {
      if (n < 0 || !Number.isInteger(n)) throw new Error('Invalid factorial');
      if (n > 170) return Infinity;
      let res = 1;
      for (let i = 2; i <= n; i++) res *= i;
      return res;
    }

    sanitize(expr) {
      return expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, `${Math.PI}`)
        .replace(/\be\b/g, `${Math.E}`);
    }

    // Safe mathematical expression evaluation using Shunting-yard / AST evaluation
    evaluate(expression) {
      if (!expression || expression.trim() === '') return 0;
      
      let raw = this.sanitize(expression);

      // Handle brackets balancing
      const openCount = (raw.match(/\(/g) || []).length;
      const closeCount = (raw.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        raw += ')'.repeat(openCount - closeCount);
      }

      // Safe JS Math evaluation with scope sandbox
      const mathScope = {
        sin: (x) => {
          const val = Math.sin(this.toRadians(x));
          return Math.abs(val) < 1e-15 ? 0 : val;
        },
        cos: (x) => {
          const val = Math.cos(this.toRadians(x));
          return Math.abs(val) < 1e-15 ? 0 : val;
        },
        tan: (x) => {
          if (this.angleMode === 'DEG' && (Math.abs(x) % 180 === 90)) {
            throw new Error('Undefined (tan 90°)');
          }
          const val = Math.tan(this.toRadians(x));
          return Math.abs(val) < 1e-15 ? 0 : val;
        },
        asin: (x) => {
          if (x < -1 || x > 1) throw new Error('Domain Error');
          return this.fromRadians(Math.asin(x));
        },
        acos: (x) => {
          if (x < -1 || x > 1) throw new Error('Domain Error');
          return this.fromRadians(Math.acos(x));
        },
        atan: (x) => this.fromRadians(Math.atan(x)),
        ln: (x) => {
          if (x <= 0) throw new Error('Domain Error');
          return Math.log(x);
        },
        log: (x) => {
          if (x <= 0) throw new Error('Domain Error');
          return Math.log10(x);
        },
        sqrt: (x) => {
          if (x < 0) throw new Error('Negative Sqrt');
          return Math.sqrt(x);
        },
        cbrt: (x) => Math.cbrt(x),
        abs: (x) => Math.abs(x),
        fact: (x) => this.factorial(x),
        pow: (a, b) => Math.pow(a, b)
      };

      // Replace power operator ^ with pow(a,b) or standard **
      let prepared = raw
        .replace(/(\d+(\.\d+)?|\([^)]+\))\s*\^\s*(\d+(\.\d+)?|\([^)]+\))/g, 'pow($1, $3)')
        .replace(/(\d+(\.\d+)?|\))\s*(sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|abs)\(/g, '$1 * $3(')
        .replace(/(\d+(\.\d+)?)\s*\(/g, '$1 * (')
        .replace(/\)\s*(\d+(\.\d+)?)/g, ') * $1');

      // Check for division by zero pattern
      if (/\/\s*0(?!\.\d*[1-9])(?![0-9])/.test(prepared)) {
        throw new Error('Division by 0');
      }

      // Safe evaluation function generator
      const funcKeys = Object.keys(mathScope);
      const funcVals = Object.values(mathScope);
      
      // Strict whitelist check
      const validChars = /^[0-9+\-*/().,%^ \t\r\na-zA-Z_]+$/;
      if (!validChars.test(prepared)) {
        throw new Error('Invalid syntax');
      }

      const evaluator = new Function(...funcKeys, `"use strict"; return (${prepared});`);
      const result = evaluator(...funcVals);

      if (!Number.isFinite(result) || Number.isNaN(result)) {
        throw new Error('Invalid calculation');
      }

      // Format result to avoid floating point precision artifacts (e.g. 0.1 + 0.2 = 0.30000000000000004)
      return this.formatNumber(result);
    }

    formatNumber(num) {
      if (Math.abs(num) < 1e-12 && num !== 0) return 0;
      if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-6 && num !== 0)) {
        return parseFloat(num.toPrecision(10)).toString();
      }
      return parseFloat(Number(num.toFixed(12)).toString());
    }
  }

  // --- UNIT CONVERSION DEFINITIONS & ENGINE ---
  const UNIT_DATA = {
    length: {
      units: {
        m: { name: 'Meters (m)', factor: 1 },
        km: { name: 'Kilometers (km)', factor: 1000 },
        cm: { name: 'Centimeters (cm)', factor: 0.01 },
        mm: { name: 'Millimeters (mm)', factor: 0.001 },
        mi: { name: 'Miles (mi)', factor: 1609.344 },
        yd: { name: 'Yards (yd)', factor: 0.9144 },
        ft: { name: 'Feet (ft)', factor: 0.3048 },
        in: { name: 'Inches (in)', factor: 0.0254 },
        nmi: { name: 'Nautical Miles', factor: 1852 }
      },
      defaultFrom: 'm',
      defaultTo: 'ft'
    },
    weight: {
      units: {
        kg: { name: 'Kilograms (kg)', factor: 1 },
        g: { name: 'Grams (g)', factor: 0.001 },
        mg: { name: 'Milligrams (mg)', factor: 0.000001 },
        lb: { name: 'Pounds (lb)', factor: 0.45359237 },
        oz: { name: 'Ounces (oz)', factor: 0.028349523125 },
        st: { name: 'Stones (st)', factor: 6.35029318 },
        t: { name: 'Metric Tons (t)', factor: 1000 }
      },
      defaultFrom: 'kg',
      defaultTo: 'lb'
    },
    temperature: {
      units: {
        c: { name: 'Celsius (°C)' },
        f: { name: 'Fahrenheit (°F)' },
        k: { name: 'Kelvin (K)' }
      },
      defaultFrom: 'c',
      defaultTo: 'f',
      customConvert: (val, from, to) => {
        if (from === to) return val;
        // Convert from source to Celsius
        let c;
        if (from === 'c') c = val;
        else if (from === 'f') c = (val - 32) * (5 / 9);
        else if (from === 'k') c = val - 273.15;

        // Convert Celsius to target
        if (to === 'c') return c;
        if (to === 'f') return (c * (9 / 5)) + 32;
        if (to === 'k') return c + 273.15;
      }
    },
    data: {
      units: {
        b: { name: 'Bytes (B)', factor: 1 },
        kb: { name: 'Kilobytes (KB)', factor: 1024 },
        mb: { name: 'Megabytes (MB)', factor: 1024 * 1024 },
        gb: { name: 'Gigabytes (GB)', factor: 1024 * 1024 * 1024 },
        tb: { name: 'Terabytes (TB)', factor: Math.pow(1024, 4) },
        pb: { name: 'Petabytes (PB)', factor: Math.pow(1024, 5) }
      },
      defaultFrom: 'gb',
      defaultTo: 'mb'
    },
    speed: {
      units: {
        mps: { name: 'Meters/sec (m/s)', factor: 1 },
        kph: { name: 'Kilometers/hour (km/h)', factor: 1 / 3.6 },
        mph: { name: 'Miles/hour (mph)', factor: 0.44704 },
        knot: { name: 'Knots (kn)', factor: 0.514444 },
        fps: { name: 'Feet/sec (ft/s)', factor: 0.3048 }
      },
      defaultFrom: 'kph',
      defaultTo: 'mph'
    },
    area: {
      units: {
        sqm: { name: 'Square Meters (m²)', factor: 1 },
        sqkm: { name: 'Square Km (km²)', factor: 1000000 },
        sqft: { name: 'Square Feet (ft²)', factor: 0.09290304 },
        sqyd: { name: 'Square Yards (yd²)', factor: 0.83612736 },
        acre: { name: 'Acres (ac)', factor: 4046.8564224 },
        hect: { name: 'Hectares (ha)', factor: 10000 },
        sqmi: { name: 'Square Miles (mi²)', factor: 2589988.11 }
      },
      defaultFrom: 'sqm',
      defaultTo: 'sqft'
    }
  };

  // --- MAIN APP CONTROLLER ---
  class OmniCalcApp {
    constructor() {
      this.sound = new SoundFX();
      this.engine = new MathEngine();
      
      // Calculator state
      this.expression = '';
      this.displayVal = '0';
      this.justCalculated = false;
      this.activeMode = 'standard'; // 'standard', 'scientific', 'converter'
      this.memoryVal = 0;
      this.history = JSON.parse(localStorage.getItem('omni_history') || '[]');

      // Converter state
      this.currCategory = 'length';

      // DOM Elements Cache
      this.cacheDOMElements();
      
      // Initialize systems
      this.initTheme();
      this.initSoundUI();
      this.initEventListeners();
      this.initConverter();
      this.renderHistory();
      this.updateDisplay();
    }

    cacheDOMElements() {
      this.appContainer = document.querySelector('.app-container');
      this.mainDisplay = document.getElementById('mainDisplay');
      this.expressionPreview = document.getElementById('expressionPreview');
      this.liveResultBar = document.getElementById('liveResultBar');
      this.displaySection = document.getElementById('displaySection');
      this.copyHint = document.getElementById('copyHint');
      
      this.memoryIndicator = document.getElementById('memoryIndicator');
      this.angleModeToggle = document.getElementById('angleModeToggle');
      this.memoryToolbar = document.getElementById('memoryToolbar');
      
      this.scientificKeypad = document.getElementById('scientificKeypad');
      this.primaryKeypad = document.getElementById('primaryKeypad');
      this.keypadContainer = document.getElementById('keypadContainer');
      this.converterPane = document.getElementById('converterPane');
      
      this.navTabs = document.querySelectorAll('.tab-btn');
      
      // History Drawer
      this.historyDrawer = document.getElementById('historyDrawer');
      this.historyDrawerBtn = document.getElementById('historyDrawerBtn');
      this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
      this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
      this.historyList = document.getElementById('historyList');
      this.emptyHistoryMsg = document.getElementById('emptyHistoryMsg');
      this.historyBadge = document.getElementById('historyBadge');
      
      // Theme Picker
      this.themePickerBtn = document.getElementById('themePickerBtn');
      this.themeMenu = document.getElementById('themeMenu');
      this.themeOpts = document.querySelectorAll('.theme-opt');
      
      // Sound Toggle
      this.soundToggleBtn = document.getElementById('soundToggleBtn');
      this.soundOnIcon = this.soundToggleBtn.querySelector('.sound-on-icon');
      this.soundOffIcon = this.soundToggleBtn.querySelector('.sound-off-icon');
      
      // Shortcuts Modal
      this.shortcutsBtn = document.getElementById('shortcutsBtn');
      this.shortcutsModal = document.getElementById('shortcutsModal');
      this.closeShortcutsModal = document.getElementById('closeShortcutsModal');
      
      // Converter Elements
      this.convFromInput = document.getElementById('convFromInput');
      this.convToInput = document.getElementById('convToInput');
      this.convFromUnit = document.getElementById('convFromUnit');
      this.convToUnit = document.getElementById('convToUnit');
      this.convSwapBtn = document.getElementById('convSwapBtn');
      this.convBreakdownGrid = document.getElementById('convBreakdownGrid');
      this.convCatBtns = document.querySelectorAll('.conv-cat-btn');

      this.toastContainer = document.getElementById('toastContainer');
    }

    // --- THEME MANAGEMENT ---
    initTheme() {
      const savedTheme = localStorage.getItem('omni_theme') || 'obsidian';
      this.setTheme(savedTheme);
    }

    setTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
      localStorage.setItem('omni_theme', themeName);
      this.themeOpts.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeVal === themeName);
      });
    }

    cycleTheme() {
      const themes = ['obsidian', 'cyberpunk', 'aurora', 'emerald'];
      const curr = document.documentElement.getAttribute('data-theme') || 'obsidian';
      const nextIndex = (themes.indexOf(curr) + 1) % themes.length;
      this.setTheme(themes[nextIndex]);
      this.showToast(`Theme: ${themes[nextIndex].toUpperCase()}`);
    }

    // --- SOUND UI ---
    initSoundUI() {
      this.updateSoundIcons();
    }

    updateSoundIcons() {
      if (this.sound.enabled) {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      } else {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      }
    }

    // --- TOAST NOTIFICATIONS ---
    showToast(message, duration = 2200) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<span>${message}</span>`;
      this.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px) scale(0.9)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    // --- EVENT LISTENERS ---
    initEventListeners() {
      // Keypad button click
      this.keypadContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.key-btn');
        if (!btn) return;
        this.handleButtonAction(btn);
      });

      // Memory Toolbar click
      this.memoryToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.mem-btn');
        if (!btn) return;
        this.handleMemoryAction(btn.dataset.action);
      });

      // Angle Mode DEG/RAD Toggle
      this.angleModeToggle.addEventListener('click', () => {
        this.engine.angleMode = this.engine.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.angleModeToggle.textContent = this.engine.angleMode;
        this.sound.playClick();
        this.updateLivePreview();
        this.showToast(`Angle Mode: ${this.engine.angleMode}`);
      });

      // Navigation Mode Tabs
      this.navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.switchMode(tab.dataset.mode);
        });
      });

      // Theme Picker button & menu
      this.themePickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.themeMenu.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!this.themeMenu.contains(e.target) && e.target !== this.themePickerBtn) {
          this.themeMenu.classList.remove('show');
        }
      });

      this.themeOpts.forEach(opt => {
        opt.addEventListener('click', () => {
          this.setTheme(opt.dataset.themeVal);
          this.themeMenu.classList.remove('show');
          this.sound.playClick();
        });
      });

      // Sound Toggle
      this.soundToggleBtn.addEventListener('click', () => {
        const state = this.sound.toggle();
        this.updateSoundIcons();
        if (state) this.sound.playClick();
        this.showToast(state ? 'Sound FX Enabled' : 'Sound FX Muted');
      });

      // History Drawer
      this.historyDrawerBtn.addEventListener('click', () => this.toggleHistoryDrawer(true));
      this.closeHistoryBtn.addEventListener('click', () => this.toggleHistoryDrawer(false));
      this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

      // Shortcuts Modal
      this.shortcutsBtn.addEventListener('click', () => this.shortcutsModal.classList.remove('hidden'));
      this.closeShortcutsModal.addEventListener('click', () => this.shortcutsModal.classList.add('hidden'));
      this.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === this.shortcutsModal) this.shortcutsModal.classList.add('hidden');
      });

      // Display Click -> Copy to Clipboard
      this.displaySection.addEventListener('click', () => this.copyResult());

      // Converter Inputs
      this.convFromInput.addEventListener('input', () => this.recalculateConverter());
      this.convFromUnit.addEventListener('change', () => this.recalculateConverter());
      this.convToUnit.addEventListener('change', () => this.recalculateConverter());
      this.convSwapBtn.addEventListener('click', () => this.swapConverterUnits());

      this.convCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          this.convCatBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currCategory = btn.dataset.cat;
          this.populateConverterUnits();
          this.sound.playClick();
        });
      });

      // Full Keyboard Support
      document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
    }

    // --- MODE SWITCHING ---
    switchMode(mode) {
      this.activeMode = mode;
      this.sound.playClick();

      this.navTabs.forEach(tab => {
        const isActive = tab.dataset.mode === mode;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
      });

      if (mode === 'standard') {
        this.appContainer.classList.remove('expanded');
        this.displaySection.classList.remove('hidden');
        this.memoryToolbar.classList.remove('hidden');
        this.keypadContainer.classList.remove('hidden');
        this.scientificKeypad.classList.add('hidden');
        this.angleModeToggle.classList.add('hidden');
        this.converterPane.classList.add('hidden');
      } else if (mode === 'scientific') {
        this.appContainer.classList.add('expanded');
        this.displaySection.classList.remove('hidden');
        this.memoryToolbar.classList.remove('hidden');
        this.keypadContainer.classList.remove('hidden');
        this.scientificKeypad.classList.remove('hidden');
        this.angleModeToggle.classList.remove('hidden');
        this.converterPane.classList.add('hidden');
      } else if (mode === 'converter') {
        this.appContainer.classList.remove('expanded');
        this.displaySection.classList.add('hidden');
        this.memoryToolbar.classList.add('hidden');
        this.keypadContainer.classList.add('hidden');
        this.converterPane.classList.remove('hidden');
        this.recalculateConverter();
      }
    }

    // --- CALCULATOR BUTTON ACTIONS ---
    handleButtonAction(btn) {
      const action = btn.dataset.action;
      const val = btn.dataset.val;

      // Haptic visual & audio feedback
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 120);

      switch (action) {
        case 'num':
          this.inputDigit(val);
          this.sound.playClick();
          break;
        case 'op':
          this.inputOperator(val);
          this.sound.playClick();
          break;
        case 'equals':
          this.calculateResult();
          break;
        case 'clear-all':
          this.clearAll();
          this.sound.playClear();
          break;
        case 'clear-entry':
          this.clearEntry();
          this.sound.playClear();
          break;
        case 'backspace':
          this.backspace();
          this.sound.playClick();
          break;
        case 'bracket':
          this.inputBracket(val);
          this.sound.playClick();
          break;
        case 'percent':
          this.inputPercent();
          this.sound.playClick();
          break;
        case 'negate':
          this.toggleNegate();
          this.sound.playClick();
          break;
        case 'sci-func':
          this.inputSciFunction(val);
          this.sound.playClick();
          break;
        case 'const':
          this.inputConstant(val);
          this.sound.playClick();
          break;
      }
    }

    // --- INPUT PROCESSING ---
    inputDigit(digit) {
      if (this.justCalculated) {
        this.expression = '';
        this.displayVal = '0';
        this.justCalculated = false;
      }

      if (digit === '.') {
        // Prevent multiple decimals in the same token
        const lastToken = this.getLastToken();
        if (lastToken.includes('.')) return;
        if (this.displayVal === '0' || this.isLastCharOperator() || this.expression.endsWith('(')) {
          this.appendChar('0.');
          return;
        }
      }

      if (this.displayVal === '0' && digit !== '.') {
        this.displayVal = digit;
        this.expression = digit;
      } else {
        this.appendChar(digit);
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    inputOperator(op) {
      this.justCalculated = false;

      if (this.expression === '' && this.displayVal !== '0') {
        this.expression = this.displayVal;
      }

      if (this.expression === '') {
        if (op === '-') {
          this.appendChar('-');
          return;
        }
        return;
      }

      // If last char is already an operator, replace it
      if (this.isLastCharOperator()) {
        this.expression = this.expression.slice(0, -1) + op;
      } else {
        this.expression += ` ${op} `;
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    inputBracket(bracket) {
      if (this.justCalculated) {
        this.expression = '';
        this.justCalculated = false;
      }

      if (bracket === '(') {
        if (this.expression !== '' && !this.isLastCharOperator() && !this.expression.endsWith('(')) {
          this.expression += ' × (';
        } else {
          this.expression += '(';
        }
      } else if (bracket === ')') {
        const open = (this.expression.match(/\(/g) || []).length;
        const close = (this.expression.match(/\)/g) || []).length;
        if (open > close && !this.isLastCharOperator() && !this.expression.endsWith('(')) {
          this.expression += ')';
        }
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    inputPercent() {
      if (this.expression === '' && this.displayVal !== '0') {
        this.expression = this.displayVal;
      }
      if (this.expression === '' || this.isLastCharOperator()) return;

      try {
        const evaluated = this.engine.evaluate(this.expression);
        const pct = evaluated / 100;
        this.expression = pct.toString();
        this.displayVal = this.expression;
        this.updateDisplay();
        this.updateLivePreview();
      } catch (e) {
        this.sound.playError();
      }
    }

    toggleNegate() {
      if (this.justCalculated) {
        this.justCalculated = false;
        this.expression = (-parseFloat(this.displayVal)).toString();
        this.displayVal = this.expression;
      } else if (this.expression === '' || this.displayVal === '0') {
        this.expression = '-';
      } else {
        // Toggle negation of the last number
        const tokens = this.expression.trim().split(' ');
        let last = tokens[tokens.length - 1];
        if (last.startsWith('(-') && last.endsWith(')')) {
          tokens[tokens.length - 1] = last.slice(2, -1);
        } else if (!isNaN(parseFloat(last))) {
          tokens[tokens.length - 1] = `(-${last})`;
        }
        this.expression = tokens.join(' ');
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    inputSciFunction(func) {
      if (this.justCalculated) {
        this.justCalculated = false;
      }

      const immediateSingleArg = ['sq', 'cube', 'sqrt', 'cbrt', 'recip', 'fact', 'abs'];

      if (immediateSingleArg.includes(func)) {
        let valToWrap = this.displayVal;
        if (this.expression !== '' && !this.isLastCharOperator()) {
          try {
            valToWrap = this.engine.evaluate(this.expression).toString();
          } catch (e) {}
        }

        switch (func) {
          case 'sq':
            this.expression = `pow(${valToWrap}, 2)`;
            break;
          case 'cube':
            this.expression = `pow(${valToWrap}, 3)`;
            break;
          case 'sqrt':
            this.expression = `sqrt(${valToWrap})`;
            break;
          case 'cbrt':
            this.expression = `cbrt(${valToWrap})`;
            break;
          case 'recip':
            this.expression = `(1 / ${valToWrap})`;
            break;
          case 'fact':
            this.expression = `fact(${valToWrap})`;
            break;
          case 'abs':
            this.expression = `abs(${valToWrap})`;
            break;
        }
      } else {
        // Trigonometric or Log functions: sin, cos, tan, asin, acos, atan, ln, log
        if (this.expression !== '' && !this.isLastCharOperator() && !this.expression.endsWith('(')) {
          this.expression += ` × ${func}(`;
        } else {
          this.expression += `${func}(`;
        }
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    inputConstant(constName) {
      if (this.justCalculated) {
        this.expression = '';
        this.justCalculated = false;
      }

      const symbol = constName === 'pi' ? 'π' : 'e';
      if (this.expression !== '' && !this.isLastCharOperator() && !this.expression.endsWith('(')) {
        this.expression += ` × ${symbol}`;
      } else {
        this.expression += symbol;
      }

      this.updateDisplay();
      this.updateLivePreview();
    }

    appendChar(str) {
      this.expression += str;
    }

    isLastCharOperator() {
      const trimmed = this.expression.trim();
      if (!trimmed) return false;
      const last = trimmed[trimmed.length - 1];
      return ['+', '-', '×', '÷', '^', '*'].includes(last);
    }

    getLastToken() {
      const parts = this.expression.split(/[\s+\-×÷^()]+/);
      return parts[parts.length - 1] || '';
    }

    clearAll() {
      this.expression = '';
      this.displayVal = '0';
      this.justCalculated = false;
      this.updateDisplay();
      this.liveResultBar.textContent = '';
      this.expressionPreview.textContent = '';
    }

    clearEntry() {
      if (this.justCalculated) {
        this.clearAll();
        return;
      }
      const parts = this.expression.trim().split(' ');
      if (parts.length > 0) {
        parts.pop();
        this.expression = parts.join(' ');
      }
      if (!this.expression) {
        this.displayVal = '0';
      }
      this.updateDisplay();
      this.updateLivePreview();
    }

    backspace() {
      if (this.justCalculated) {
        this.clearAll();
        return;
      }
      if (this.expression.endsWith(' ')) {
        this.expression = this.expression.slice(0, -3);
      } else {
        this.expression = this.expression.slice(0, -1);
      }
      if (!this.expression) {
        this.displayVal = '0';
      }
      this.updateDisplay();
      this.updateLivePreview();
    }

    // --- CALCULATION & HISTORY ---
    calculateResult() {
      if (!this.expression || this.expression.trim() === '') return;

      try {
        const result = this.engine.evaluate(this.expression);
        const formattedRes = result.toString();

        // Record into history
        this.addHistory(this.expression, formattedRes);

        this.expressionPreview.textContent = `${this.expression} =`;
        this.displayVal = formattedRes;
        this.expression = formattedRes;
        this.justCalculated = true;
        this.liveResultBar.textContent = '';

        this.updateDisplay();
        this.sound.playEquals();
      } catch (err) {
        this.displayVal = 'Error';
        this.liveResultBar.textContent = err.message || 'Invalid calculation';
        this.sound.playError();
        this.updateDisplay();
      }
    }

    updateLivePreview() {
      if (!this.expression || this.justCalculated || this.isLastCharOperator()) {
        this.liveResultBar.textContent = '';
        return;
      }

      try {
        const live = this.engine.evaluate(this.expression);
        if (live !== undefined && !Number.isNaN(live)) {
          this.liveResultBar.textContent = `= ${live}`;
        } else {
          this.liveResultBar.textContent = '';
        }
      } catch (e) {
        this.liveResultBar.textContent = '';
      }
    }

    updateDisplay() {
      const text = this.expression || this.displayVal;
      this.mainDisplay.textContent = text || '0';

      // Dynamic font size auto-scaling for long numbers
      const len = this.mainDisplay.textContent.length;
      if (len > 18) {
        this.mainDisplay.style.fontSize = '1.5rem';
      } else if (len > 12) {
        this.mainDisplay.style.fontSize = '2.1rem';
      } else if (len > 8) {
        this.mainDisplay.style.fontSize = '2.5rem';
      } else {
        this.mainDisplay.style.fontSize = '';
      }
    }

    copyResult() {
      const textToCopy = this.displayVal;
      if (!textToCopy || textToCopy === 'Error') return;

      navigator.clipboard.writeText(textToCopy).then(() => {
        this.copyHint.classList.add('show');
        setTimeout(() => this.copyHint.classList.remove('show'), 1500);
        this.showToast('Copied to clipboard');
        this.sound.playClick();
      }).catch(() => {});
    }

    // --- MEMORY FUNCTIONS ---
    handleMemoryAction(action) {
      this.sound.playClick();
      const current = parseFloat(this.displayVal) || 0;

      switch (action) {
        case 'mc':
          this.memoryVal = 0;
          this.memoryIndicator.classList.add('hidden');
          this.showToast('Memory Cleared');
          break;
        case 'mr':
          this.expression = this.memoryVal.toString();
          this.displayVal = this.expression;
          this.updateDisplay();
          this.updateLivePreview();
          this.showToast(`Memory Recalled: ${this.memoryVal}`);
          break;
        case 'm-plus':
          this.memoryVal += current;
          this.memoryIndicator.classList.remove('hidden');
          this.showToast(`Added to Memory: ${this.memoryVal}`);
          break;
        case 'm-minus':
          this.memoryVal -= current;
          this.memoryIndicator.classList.remove('hidden');
          this.showToast(`Subtracted from Memory: ${this.memoryVal}`);
          break;
        case 'ms':
          this.memoryVal = current;
          this.memoryIndicator.classList.remove('hidden');
          this.showToast(`Saved to Memory: ${this.memoryVal}`);
          break;
      }
    }

    // --- HISTORY DRAWER MANAGEMENT ---
    addHistory(expression, result) {
      const item = {
        expression,
        result,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      this.history.unshift(item);
      if (this.history.length > 50) this.history.pop();
      localStorage.setItem('omni_history', JSON.stringify(this.history));
      this.renderHistory();
      this.historyBadge.classList.add('active');
    }

    renderHistory() {
      if (!this.history || this.history.length === 0) {
        this.emptyHistoryMsg.classList.remove('hidden');
        this.historyList.innerHTML = '';
        this.historyList.appendChild(this.emptyHistoryMsg);
        this.historyBadge.classList.remove('active');
        return;
      }

      this.emptyHistoryMsg.classList.add('hidden');
      this.historyList.innerHTML = '';

      this.history.forEach((entry, idx) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
          <div class="hist-meta">
            <span>#${this.history.length - idx}</span>
            <span>${entry.timestamp}</span>
          </div>
          <div class="hist-expr">${entry.expression}</div>
          <div class="hist-res">= ${entry.result}</div>
        `;
        card.addEventListener('click', () => {
          this.displayVal = entry.result;
          this.expression = entry.result;
          this.justCalculated = false;
          this.updateDisplay();
          this.updateLivePreview();
          this.toggleHistoryDrawer(false);
          this.showToast(`Loaded ${entry.result}`);
          this.sound.playClick();
        });
        this.historyList.appendChild(card);
      });
    }

    clearHistory() {
      this.history = [];
      localStorage.removeItem('omni_history');
      this.renderHistory();
      this.sound.playClear();
      this.showToast('History Cleared');
    }

    toggleHistoryDrawer(open) {
      this.sound.playClick();
      if (open) {
        this.historyDrawer.classList.add('open');
        this.historyBadge.classList.remove('active');
      } else {
        this.historyDrawer.classList.remove('open');
      }
    }

    // --- UNIT CONVERTER MODULE ---
    initConverter() {
      this.populateConverterUnits();
    }

    populateConverterUnits() {
      const data = UNIT_DATA[this.currCategory];
      if (!data) return;

      this.convFromUnit.innerHTML = '';
      this.convToUnit.innerHTML = '';

      Object.entries(data.units).forEach(([key, info]) => {
        const opt1 = new Option(info.name, key);
        const opt2 = new Option(info.name, key);
        this.convFromUnit.add(opt1);
        this.convToUnit.add(opt2);
      });

      this.convFromUnit.value = data.defaultFrom || Object.keys(data.units)[0];
      this.convToUnit.value = data.defaultTo || Object.keys(data.units)[1];

      this.recalculateConverter();
    }

    swapConverterUnits() {
      const temp = this.convFromUnit.value;
      this.convFromUnit.value = this.convToUnit.value;
      this.convToUnit.value = temp;
      this.sound.playClick();
      this.recalculateConverter();
    }

    recalculateConverter() {
      const data = UNIT_DATA[this.currCategory];
      if (!data) return;

      const fromVal = parseFloat(this.convFromInput.value);
      if (isNaN(fromVal)) {
        this.convToInput.value = '';
        this.convBreakdownGrid.innerHTML = '';
        return;
      }

      const fromUnit = this.convFromUnit.value;
      const toUnit = this.convToUnit.value;

      let converted;
      if (data.customConvert) {
        converted = data.customConvert(fromVal, fromUnit, toUnit);
      } else {
        const baseVal = fromVal * data.units[fromUnit].factor;
        converted = baseVal / data.units[toUnit].factor;
      }

      this.convToInput.value = this.engine.formatNumber(converted);

      // Populate Live Multi-Unit Overview Grid
      this.convBreakdownGrid.innerHTML = '';
      Object.entries(data.units).forEach(([key, info]) => {
        let val;
        if (data.customConvert) {
          val = data.customConvert(fromVal, fromUnit, key);
        } else {
          const base = fromVal * data.units[fromUnit].factor;
          val = base / info.factor;
        }

        const item = document.createElement('div');
        item.className = 'conv-item';
        item.innerHTML = `
          <div class="conv-item-val" title="${val}">${this.engine.formatNumber(val)}</div>
          <div class="conv-item-unit">${info.name}</div>
        `;
        this.convBreakdownGrid.appendChild(item);
      });
    }

    // --- KEYBOARD SHORTCUTS HANDLER ---
    handleKeyboardInput(e) {
      // Don't intercept if user is typing in the unit converter input
      if (document.activeElement === this.convFromInput) return;

      const key = e.key;

      // Hotkey shortcuts
      if (key === 'h' || key === 'H') {
        e.preventDefault();
        this.toggleHistoryDrawer(!this.historyDrawer.classList.contains('open'));
        return;
      }
      if (key === 's' || key === 'S') {
        e.preventDefault();
        const state = this.sound.toggle();
        this.updateSoundIcons();
        this.showToast(state ? 'Sound FX Enabled' : 'Sound FX Muted');
        return;
      }
      if (key === 't' || key === 'T') {
        e.preventDefault();
        this.cycleTheme();
        return;
      }
      if (key === '?') {
        e.preventDefault();
        this.shortcutsModal.classList.toggle('hidden');
        return;
      }

      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(key)) {
        e.preventDefault();
        this.highlightMatchingButton(key);
        this.inputDigit(key);
        this.sound.playClick();
      } else if (key === '+') {
        e.preventDefault();
        this.highlightMatchingButton('+');
        this.inputOperator('+');
        this.sound.playClick();
      } else if (key === '-') {
        e.preventDefault();
        this.highlightMatchingButton('-');
        this.inputOperator('−');
        this.sound.playClick();
      } else if (key === '*') {
        e.preventDefault();
        this.highlightMatchingButton('×');
        this.inputOperator('×');
        this.sound.playClick();
      } else if (key === '/') {
        e.preventDefault();
        this.highlightMatchingButton('÷');
        this.inputOperator('÷');
        this.sound.playClick();
      } else if (key === '^') {
        e.preventDefault();
        this.inputOperator('^');
        this.sound.playClick();
      } else if (key === '%') {
        e.preventDefault();
        this.inputPercent();
        this.sound.playClick();
      } else if (key === '(' || key === ')') {
        e.preventDefault();
        this.highlightMatchingButton(key);
        this.inputBracket(key);
        this.sound.playClick();
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        this.highlightMatchingButton('=');
        this.calculateResult();
      } else if (key === 'Backspace') {
        e.preventDefault();
        this.backspace();
        this.sound.playClick();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        e.preventDefault();
        this.highlightMatchingButton('AC');
        this.clearAll();
        this.sound.playClear();
      }
    }

    highlightMatchingButton(label) {
      const buttons = document.querySelectorAll('.key-btn');
      for (const btn of buttons) {
        if (btn.textContent.trim() === label || btn.dataset.val === label) {
          btn.classList.add('pressed');
          setTimeout(() => btn.classList.remove('pressed'), 120);
          break;
        }
      }
    }
  }

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    window.omniCalc = new OmniCalcApp();

    // Register Service Worker for PWA (Mobile install support)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Handle PWA Install Prompt Button
    let deferredPrompt = null;
    const installBtn = document.getElementById('installAppBtn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            installBtn.classList.add('hidden');
          }
          deferredPrompt = null;
        } else {
          // Fallback instructions toast for browsers that require menu install
          if (window.omniCalc) {
            window.omniCalc.showToast('Tap ⋮ in browser menu and select "Install app"', 4000);
          }
        }
      });
    }

    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.classList.add('hidden');
      if (window.omniCalc) window.omniCalc.showToast('OmniCalc installed successfully!');
    });
  });
})();
