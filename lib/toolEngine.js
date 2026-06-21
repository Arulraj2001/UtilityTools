import { evaluate, format as mathFormat } from 'mathjs';
import { calculateCBM, calculateChargeableWeight, calculateParcelDimensions, calculateVolumetricWeight } from './logisticsUtils';
import { calculateShippingCost, calculateCourierCharges, calculateAirFreight, calculatePackagingCost } from './logistics/pricing';
import { calculateContainerLoad } from './logistics/container';
import { calculateDeliveryTime } from './logistics/delivery';
import {
  calculateAmazonFees,
  calculateFlipkartFees,
  calculateProfitMargin,
  calculateCODCharges,
  generateShippingLabel,
  calculateInventory,
  generateGSTInvoice,
  calculateProductPricing,
  calculateROI,
  calculateSellerProfit,
} from './ecommerce';

/**
 * Safe tool engine — no new Function(), uses mathjs for expressions.
 */
export async function runTool(tool, inputs) {
  const config = safeParseJSON(tool.formula_config) || {};

  switch (tool.formula_type) {
    case 'math':       return runMath(config, inputs);
    case 'javascript': return runSafeJS(config, inputs);
    case 'text_transform': return runTextTransform(config, inputs);
    case 'conversion': return runConversion(config, inputs);
    case 'generator':  return runGenerator(config, inputs);
    case 'builtin':    return runBuiltin(tool.slug, inputs);
    case 'custom':     return { info: 'Custom client-side tool' };
    default:           return { error: 'Unknown formula type' };
  }
}

// ─── Math (mathjs) ────────────────────────────────────────────────────────────
function runMath(config, inputs) {
  const scope = { ...inputs };
  // Convert string numbers to actual numbers
  for (const k in scope) {
    if (typeof scope[k] === 'string' && scope[k] !== '' && !isNaN(Number(scope[k]))) {
      scope[k] = Number(scope[k]);
    }
  }

  if (config.expressions) {
    const results = {};
    for (const [key, expr] of Object.entries(config.expressions)) {
      results[key] = evaluate(expr, { ...scope, ...results });
    }
    return formatMathResults(results, config.labels || {});
  }

  if (config.expression) {
    const result = evaluate(config.expression, scope);
    return { type: 'number', value: result, label: config.label || 'Result', formatted: formatNumber(result) };
  }

  return { error: 'No expression defined' };
}

function formatMathResults(results, labels) {
  const cards = Object.entries(results).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value: typeof value === 'number' ? formatNumber(value) : value,
    raw: value,
  }));
  return { type: 'cards', cards };
}

// ─── Safe JS (via mathjs scope) ───────────────────────────────────────────────
function runSafeJS(config, inputs) {
  // Use mathjs evaluate for safe expression evaluation
  const scope = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (v !== '' && !isNaN(Number(v))) scope[k] = Number(v);
    else scope[k] = v;
  }

  if (config.steps) {
    const cards = [];
    for (const step of config.steps) {
      const val = evaluate(step.expr, { ...scope });
      scope[step.key] = val;
      if (step.display !== false) {
        cards.push({ key: step.key, label: step.label || step.key, value: formatNumber(val), raw: val });
      }
    }
    return { type: 'cards', cards };
  }

  return { error: 'No steps defined' };
}

// ─── Text Transform ───────────────────────────────────────────────────────────
function runTextTransform(config, inputs) {
  const text = inputs.text || inputs.input || Object.values(inputs)[0] || '';
  const op = config.operation;

  const ops = {
    uppercase:    t => t.toUpperCase(),
    lowercase:    t => t.toLowerCase(),
    titlecase:    t => t.replace(/\b\w/g, c => c.toUpperCase()),
    reverse:      t => t.split('').reverse().join(''),
    word_count:   t => {
      const words = t.trim() ? t.trim().split(/\s+/).length : 0;
      const chars = t.length;
      const charsNoSpace = t.replace(/\s/g, '').length;
      const sentences = t.split(/[.!?]+/).filter(Boolean).length;
      const paragraphs = t.split(/\n\n+/).filter(Boolean).length;
      const readingTime = Math.ceil(words / 200);
      return {
        type: 'cards',
        cards: [
          { label: 'Words', value: words.toLocaleString(), raw: words },
          { label: 'Characters', value: chars.toLocaleString(), raw: chars },
          { label: 'Characters (no spaces)', value: charsNoSpace.toLocaleString(), raw: charsNoSpace },
          { label: 'Sentences', value: sentences.toLocaleString(), raw: sentences },
          { label: 'Paragraphs', value: paragraphs.toLocaleString(), raw: paragraphs },
          { label: 'Reading Time', value: `${readingTime} min`, raw: readingTime },
        ],
      };
    },
    base64_encode: t => { try { return { type: 'text', value: btoa(unescape(encodeURIComponent(t))), label: 'Encoded' }; } catch { return { error: 'Encoding failed' }; } },
    base64_decode: t => { try { return { type: 'text', value: decodeURIComponent(escape(atob(t))), label: 'Decoded' }; } catch { return { error: 'Invalid Base64' }; } },
    url_encode:   t => ({ type: 'text', value: encodeURIComponent(t), label: 'URL Encoded' }),
    url_decode:   t => ({ type: 'text', value: decodeURIComponent(t), label: 'URL Decoded' }),
    json_format:  t => {
      try {
        const parsed = JSON.parse(t);
        return { type: 'json', value: JSON.stringify(parsed, null, 2), label: 'Formatted JSON' };
      } catch (e) {
        return { error: `Invalid JSON: ${e.message}` };
      }
    },
    json_minify:  t => {
      try { return { type: 'text', value: JSON.stringify(JSON.parse(t)), label: 'Minified JSON' }; }
      catch { return { error: 'Invalid JSON' }; }
    },
    remove_spaces: t => ({ type: 'text', value: t.replace(/\s+/g, ' ').trim(), label: 'Result' }),
    remove_lines:  t => ({ type: 'text', value: t.split('\n').filter(l => l.trim()).join('\n'), label: 'Result' }),
    sort_lines:    t => ({ type: 'text', value: t.split('\n').sort().join('\n'), label: 'Sorted' }),
    unique_lines:  t => ({ type: 'text', value: [...new Set(t.split('\n'))].join('\n'), label: 'Unique Lines' }),
    count_lines:   t => ({ type: 'number', value: t.split('\n').filter(Boolean).length, label: 'Line Count' }),
    md5_hash:      t => ({ type: 'text', value: simpleHash(t), label: 'Hash (SHA-like)' }),
    slug:          t => ({ type: 'text', value: t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label: 'Slug' }),
    camelcase:     t => ({ type: 'text', value: t.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()), label: 'camelCase' }),
    snakecase:     t => ({ type: 'text', value: t.replace(/[\s-]+/g, '_').toLowerCase(), label: 'snake_case' }),
    kebabcase:     t => ({ type: 'text', value: t.replace(/[\s_]+/g, '-').toLowerCase(), label: 'kebab-case' }),
  };

  if (!ops[op]) return { error: `Unknown text operation: ${op}` };
  const fn = ops[op];
  const result = fn(text);
  if (result && typeof result === 'object' && (result.type || result.error)) return result;
  return { type: 'text', value: result, label: 'Result' };
}

// ─── Conversion ────────────────────────────────────────────────────────────────
function runConversion(config, inputs) {
  const value = Number(inputs.value || inputs.amount || 0);
  const from = inputs.from_unit || inputs.from || config.default_from || '';
  const to   = inputs.to_unit   || inputs.to   || config.default_to   || '';

  const table = config.table || {};
  if (!table[from] || !table[to]) return { error: `Unknown units: ${from} → ${to}` };

  const base  = value * table[from];
  const result = base / table[to];
  return { type: 'number', value: result, formatted: formatNumber(result), label: `${value} ${from} = ${formatNumber(result)} ${to}` };
}

// ─── Generator ────────────────────────────────────────────────────────────────
function runGenerator(config, inputs) {
  const gen = config.generator;
  switch (gen) {
    case 'password': {
      const len = Number(inputs.length || 12);
      const useUpper = inputs.uppercase !== 'false';
      const useLower = inputs.lowercase !== 'false';
      const useNums  = inputs.numbers  !== 'false';
      const useSyms  = inputs.symbols  === 'true';
      let chars = '';
      if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
      if (useNums)  chars += '0123456789';
      if (useSyms)  chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      return { type: 'text', value: Array.from(arr).map(b => chars[b % chars.length]).join(''), label: 'Generated Password' };
    }
    case 'uuid':
      return { type: 'text', value: crypto.randomUUID(), label: 'UUID' };
    case 'color': {
      const hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
      const rgb = hexToRgb(hex);
      return {
        type: 'cards',
        cards: [
          { label: 'HEX', value: hex },
          { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
          { label: 'HSL', value: rgbToHsl(rgb.r, rgb.g, rgb.b) },
        ],
        extra: { color: hex },
      };
    }
    default:
      return { error: `Unknown generator: ${gen}` };
  }
}

// ─── Builtin tools (slug-based) ────────────────────────────────────────────────
function runBuiltin(slug, inputs) {
  switch (slug) {
    case 'emi-calculator': return calcEMI(inputs);
    case 'sip-calculator': return calcSIP(inputs);
    case 'bmi-calculator': return calcBMI(inputs);
    case 'age-calculator': return calcAge(inputs);
    case 'cgpa-calculator': return calcCGPA(inputs);
    case 'gpa-calculator': return calcGPA(inputs);
    case 'sgpa-calculator': return calcSGPA(inputs);
    case 'attendance-calculator': return calcAttendance(inputs);
    case 'marks-percentage-calculator': return calcMarksPercentage(inputs);
    case 'final-grade-calculator': return calcFinalGrade(inputs);
    case 'grade-calculator': return calcGrade(inputs);
    case 'study-time-calculator': return calcStudyTime(inputs);
    case 'exam-score-calculator': return calcExamScore(inputs);
    case 'semester-planner': return calcSemesterPlanner(inputs);
    case 'credit-calculator': return calcCredit(inputs);
    case 'backlog-calculator': return calcBacklog(inputs);
    case 'cgpa-to-percentage': return calcCgpaToPercentage(inputs);
    case 'percentage-to-cgpa': return calcPercentageToCgpa(inputs);
    case 'cutoff-calculator': return calcCutoff(inputs);
    case 'college-fees-calculator': return calcCollegeFees(inputs);
    case 'gst-calculator': return calcGST(inputs);
    case 'amazon-fee-calculator': return calculateAmazonFees(inputs);
    case 'flipkart-fee-calculator': return calculateFlipkartFees(inputs);
    case 'profit-margin-calculator': return calculateProfitMargin(inputs);
    case 'cod-charge-calculator': return calculateCODCharges(inputs);
    case 'shipping-label-generator': return generateShippingLabel(inputs);
    case 'inventory-calculator': return calculateInventory(inputs);
    case 'gst-invoice-generator': return generateGSTInvoice(inputs);
    case 'product-pricing-calculator': return calculateProductPricing(inputs);
    case 'roi-calculator': return calculateROI(inputs);
    case 'seller-profit-estimator': return calculateSellerProfit(inputs);
    case 'youtube-money-calculator': return calcYouTubeMoney(inputs);
    case 'youtube-watch-time-calculator': return calcYouTubeWatchTime(inputs);
    case 'youtube-thumbnail-size-checker': return calcYouTubeThumbnailCheck(inputs);
    case 'word-to-pdf': return { info: 'Client-side PDF converter tool' };
    case 'instagram-engagement-calculator': return calcInstagramEngagement(inputs);
    case 'tiktok-money-calculator': return calcTikTokMoney(inputs);
    case 'social-media-roi-calculator': return calcSocialMediaROI(inputs);
    case 'content-upload-scheduler': return calcContentUploadScheduler(inputs);
    case 'hashtag-density-checker': return calcHashtagDensity(inputs);
    case 'eb-bill-calculator-tamilnadu': return calcEBBillTamilNadu(inputs);
    case 'tneb-bill-calculator': return calcTNEBBill(inputs);
    case 'salary-hike-calculator-india': return calcSalaryHikeIndia(inputs);
    case 'pf-calculator-india': return calcPFCalculatorIndia(inputs);
    case 'gratuity-calculator-india': return calcGratuityIndia(inputs);
    case 'in-hand-salary-calculator': return calcInHandSalaryIndia(inputs);
    case 'fuel-expense-calculator-india': return calcFuelExpenseIndia(inputs);
    case 'loan-eligibility-calculator-india': return calcLoanEligibilityIndia(inputs);
    case 'love-percentage-calculator': return calcLovePercentage(inputs);
    case 'crush-compatibility-calculator': return calcCrushCompatibility(inputs);
    case 'friendship-calculator': return calcFriendship(inputs);
    case 'zodiac-compatibility': return calcZodiacCompatibility(inputs);
    case 'baby-name-numerology': return calcBabyNameNumerology(inputs);
    case 'word-counter': return runTextTransform({ operation: 'word_count' }, inputs);
    case 'json-formatter': return runTextTransform({ operation: 'json_format' }, inputs);
    case 'base64-encoder': return runTextTransform({ operation: 'base64_encode' }, inputs);
    case 'base64-decoder': return runTextTransform({ operation: 'base64_decode' }, inputs);
    case 'url-encoder': return runTextTransform({ operation: 'url_encode' }, inputs);
    case 'url-decoder': return runTextTransform({ operation: 'url_decode' }, inputs);
    case 'password-generator': return runGenerator({ generator: 'password' }, inputs);
    case 'uuid-generator': return runGenerator({ generator: 'uuid' }, inputs);
    case 'percentage-calculator': return calcPercentage(inputs);
    case 'discount-calculator': return calcDiscount(inputs);
    case 'compound-interest': return calcCompoundInterest(inputs);
    case 'simple-interest': return calcSimpleInterest(inputs);
    case 'tip-calculator': return calcTip(inputs);
    case 'volumetric-weight-calculator': return calculateVolumetricWeight(inputs);
    case 'chargeable-weight-calculator': return calculateChargeableWeight(inputs);
    case 'cbm-calculator': return calculateCBM(inputs);
    case 'parcel-dimension-calculator': return calculateParcelDimensions(inputs);
    case 'shipping-cost-calculator': return calcShippingCost(inputs);
    case 'courier-charges-calculator': return calcCourierCharges(inputs);
    case 'air-freight-calculator': return calcAirFreight(inputs);
    case 'container-load-calculator': return calcContainerLoad(inputs);
    case 'packaging-cost-calculator': return calcPackagingCost(inputs);
    case 'delivery-time-estimator': return calcDeliveryTime(inputs);
    case 'fuel-cost': return calcFuelCost(inputs);
    case 'unit-converter': return calcUnitConverter(inputs);
    case 'temperature-converter': return calcTemperature(inputs);
    case 'roman-numerals': return calcRoman(inputs);
    case 'binary-converter': return calcBinary(inputs);
    case 'hex-converter': return calcHex(inputs);
    case 'text-reverser': return runTextTransform({ operation: 'reverse' }, inputs);
    case 'slug-generator': return runTextTransform({ operation: 'slug' }, inputs);
    case 'camelcase': return runTextTransform({ operation: 'camelcase' }, inputs);
    case 'case-converter': return caseConverter(inputs);
    case 'line-sorter': return runTextTransform({ operation: 'sort_lines' }, inputs);
    case 'duplicate-remover': return runTextTransform({ operation: 'unique_lines' }, inputs);
    case 'merge-pdf': return mergePDF(inputs);
    case 'split-pdf': return splitPDF(inputs);
    case 'compress-pdf': return compressPDF(inputs);
    case 'pdf-to-jpg': return pdfToJPG(inputs);
    case 'jpg-to-pdf': return jpgToPDF(inputs);
    case 'protect-pdf': return protectPDF(inputs);
    case 'remove-pages-pdf': return removePagesPDF(inputs);
    // Math Tools
    case 'scientific-calculator': return calcScientific(inputs);
    case 'fraction-calculator': return calcFraction(inputs);
    case 'lcm-calculator': return calcLCM(inputs);
    case 'hcf-calculator': return calcHCF(inputs);
    case 'average-calculator': return calcAverage(inputs);
    case 'probability-calculator': return calcProbability(inputs);
    case 'standard-deviation-calculator': return calcStdDev(inputs);
    case 'matrix-calculator': return calcMatrix(inputs);
    case 'equation-solver': return calcEquation(inputs);
    case 'prime-number-checker': return calcPrimes(inputs);
    // Health & Fitness Tools
    case 'calorie-calculator': return calcCalorieNeeds(inputs);
    case 'body-fat-calculator': return calcBodyFat(inputs);
    case 'water-intake-calculator': return calcWaterIntake(inputs);
    case 'bmr-calculator': return calcBMR(inputs);
    case 'ideal-weight-calculator': return calcIdealWeight(inputs);
    case 'pregnancy-calculator': return calcPregnancy(inputs);
    case 'ovulation-calculator': return calcOvulation(inputs);
    case 'sleep-calculator': return calcSleep(inputs);
    case 'date-difference': return calcDateDifference(inputs);
    case 'countdown-timer': return calcCountdownTimer(inputs);
    case 'stopwatch': return calcStopwatch(inputs);
    case 'world-clock': return calcWorldClock(inputs);
    case 'timezone-converter': return calcTimezoneConverter(inputs);
    case 'business-days-calculator': return calcBusinessDays(inputs);
    case 'date-calculator': return calcDateCalculator(inputs);
    case 'week-number-calculator': return calcWeekNumber(inputs);
    case 'unix-timestamp-converter': return calcUnixTimestampConverter(inputs);
    // SEO Tools
    case 'meta-tag-generator': return generateMetaTags(inputs);
    case 'open-graph-generator': return generateOpenGraph(inputs);
    case 'robots-txt-generator': return generateRobotsTxt(inputs);
    case 'sitemap-generator': return generateSitemap(inputs);
    case 'schema-generator': return generateSchema(inputs);
    case 'utm-builder': return buildUTM(inputs);
    case 'keyword-density-checker': return checkKeywordDensity(inputs);
    case 'word-density-checker': return checkWordDensity(inputs);
    case 'html-minifier': return minifyHTML(inputs);
    case 'css-minifier': return minifyCSS(inputs);
    case 'javascript-minifier': return minifyJavaScript(inputs);
    default: return { error: `No builtin for: ${slug}` };
  }
}

// ─── Builtin implementations ──────────────────────────────────────────────────
function calcEMI(inputs) {
  const P = Number(inputs.principal || 0);
  const annualRate = Number(inputs.rate || 0);
  const tenureVal = Number(inputs.tenure || inputs.tenure_months || 0);
  const tenureUnit = inputs.tenure_unit || 'Years';
  
  // Dynamic months calculation with backwards compatibility check
  let months = tenureUnit === 'Months' ? tenureVal : tenureVal * 12;
  if (months === 0 && inputs.tenure_months) {
    months = Number(inputs.tenure_months);
  }
  
  if (P <= 0 || annualRate <= 0 || months <= 0) {
    return { error: 'Please enter valid loan details (Amount, Rate, and Tenure).' };
  }

  const r = annualRate / (12 * 100);
  const emi = r === 0 ? P / months : (P * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);

  // Optional prepayments inputs
  const prepaymentMonthly = Number(inputs.prepayment_monthly || 0);
  const prepaymentOneoff = Number(inputs.prepayment_oneoff || 0);
  const prepaymentOneoffMonth = Number(inputs.prepayment_oneoff_month || 12);

  // 1. Calculate Baseline (no prepayments)
  let balanceBase = P;
  let totalInterestBase = 0;
  let totalPaymentBase = 0;
  const baselineSchedule = [];
  
  for (let i = 1; i <= months; i++) {
    const interest = balanceBase * r;
    const principal = Math.min(balanceBase, emi - interest);
    balanceBase -= principal;
    totalInterestBase += interest;
    totalPaymentBase += (principal + interest);
    baselineSchedule.push({ month: i, emi, principal, interest, balance: Math.max(0, balanceBase) });
    if (balanceBase <= 0) break;
  }

  // 2. Calculate Revised (with prepayments)
  let balanceRev = P;
  let totalInterestRev = 0;
  let totalPaymentRev = 0;
  let revisedMonths = 0;
  const revisedSchedule = [];

  for (let i = 1; i <= months; i++) {
    const interest = balanceRev * r;
    let standardPrincipal = emi - interest;
    if (standardPrincipal < 0) standardPrincipal = 0;

    let extra = prepaymentMonthly;
    if (i === prepaymentOneoffMonth) {
      extra += prepaymentOneoff;
    }
    
    let totalPrincipal = standardPrincipal + extra;
    if (totalPrincipal > balanceRev) {
      totalPrincipal = balanceRev;
    }

    balanceRev -= totalPrincipal;
    totalInterestRev += interest;
    totalPaymentRev += (totalPrincipal + interest);
    revisedMonths = i;

    const actualEmiThisMonth = emi + (i === prepaymentOneoffMonth ? prepaymentOneoff : 0) + prepaymentMonthly;
    revisedSchedule.push({
      month: i,
      emi: actualEmiThisMonth,
      principal: totalPrincipal,
      interest,
      balance: Math.max(0, balanceRev)
    });

    if (balanceRev <= 0) break;
  }

  const interestSaved = totalInterestBase - totalInterestRev;
  const tenureReducedMonths = months - revisedMonths;

  const cards = [
    { label: 'Monthly EMI', value: formatCurrency(emi), raw: emi, highlight: true },
    { label: 'Total Principal', value: formatCurrency(P), raw: P },
    { label: 'Total Interest (Revised)', value: formatCurrency(totalInterestRev), raw: totalInterestRev },
    { label: 'Total Repayment (Revised)', value: formatCurrency(totalPaymentRev), raw: totalPaymentRev },
  ];

  if (interestSaved > 0) {
    cards.push({ label: 'Total Interest Saved', value: formatCurrency(interestSaved), raw: interestSaved, highlight: true, color: '#22c55e' });
  }
  if (tenureReducedMonths > 0) {
    cards.push({ label: 'Repayment Period Reduced By', value: `${tenureReducedMonths} months (${(tenureReducedMonths / 12).toFixed(1)} years)`, raw: tenureReducedMonths, color: '#22c55e' });
  }

  // Format table: if months > 12, group by year for cleaner UI presentation
  const useYearlyAggregation = months > 12;
  const tableData = useYearlyAggregation
    ? aggregateScheduleYearly(revisedSchedule)
    : revisedSchedule.map(row => ({
        Month: row.month,
        Payment: formatCurrency(row.emi),
        Principal: formatCurrency(row.principal),
        Interest: formatCurrency(row.interest),
        'Ending Balance': formatCurrency(row.balance),
      }));

  return {
    type: 'cards',
    cards,
    chart: {
      type: 'pie',
      title: 'Revised Loan Cost Split',
      data: [
        { name: 'Principal Amount', value: Math.round(P) },
        { name: 'Total Interest Paid', value: Math.round(totalInterestRev) },
      ],
    },
    table: tableData,
  };
}

function aggregateScheduleYearly(monthlySchedule) {
  const yearly = [];
  let currentYear = 1;
  let yrPrincipal = 0;
  let yrInterest = 0;
  let yrEMI = 0;
  let lastBalance = 0;

  for (let i = 0; i < monthlySchedule.length; i++) {
    const m = monthlySchedule[i];
    yrPrincipal += m.principal;
    yrInterest += m.interest;
    yrEMI += m.emi || 0;
    lastBalance = m.balance;

    if ((i + 1) % 12 === 0 || i === monthlySchedule.length - 1) {
      yearly.push({
        Year: `Year ${currentYear}`,
        Payments: formatCurrency(yrEMI),
        Principal: formatCurrency(yrPrincipal),
        Interest: formatCurrency(yrInterest),
        'Ending Balance': formatCurrency(lastBalance),
      });
      currentYear++;
      yrPrincipal = 0;
      yrInterest = 0;
      yrEMI = 0;
    }
  }
  return yearly;
}

function calcSIP(inputs) {
  const monthly = Number(inputs.monthly_investment || 0);
  const annualRate = Number(inputs.expected_return || 0);
  const years = Number(inputs.tenure_years || 0);
  const stepUpPercent = Number(inputs.step_up_percent || 0);
  const inflationRate = Number(inputs.inflation_rate || 0);

  if (monthly <= 0 || annualRate <= 0 || years <= 0) {
    return { error: 'Please enter valid investment details (Monthly Amount, Expected Return, and Period).' };
  }

  const r = annualRate / (12 * 100);
  
  // Compute year-by-year compounding growth with Top-up (step-up)
  let portfolioValue = 0;
  let totalInvested = 0;
  let currentMonthly = monthly;
  const yearlyData = [];

  for (let y = 1; y <= years; y++) {
    for (let m = 1; m <= 12; m++) {
      portfolioValue = (portfolioValue + currentMonthly) * (1 + r);
      totalInvested += currentMonthly;
    }
    // Record end of year portfolio health
    yearlyData.push({
      name: `Year ${y}`,
      invested: totalInvested,
      value: Math.round(portfolioValue),
    });
    // Apply annual step-up rate
    currentMonthly = currentMonthly * (1 + stepUpPercent / 100);
  }

  const returns = portfolioValue - totalInvested;

  const cards = [
    { label: 'Expected Wealth Accumulated', value: formatCurrency(portfolioValue), raw: portfolioValue, highlight: true },
    { label: 'Total Invested Amount', value: formatCurrency(totalInvested), raw: totalInvested },
    { label: 'Wealth Gained', value: formatCurrency(returns), raw: returns },
    { label: 'Return Rate', value: `${annualRate}% p.a.`, raw: annualRate },
  ];

  // Inflation adjustments calculation
  if (inflationRate > 0) {
    const inflationAdjustedValue = portfolioValue / Math.pow(1 + inflationRate / 100, years);
    const purchasingPowerLoss = portfolioValue - inflationAdjustedValue;
    cards.push({
      label: 'Inflation-Adjusted Future Value',
      value: formatCurrency(inflationAdjustedValue),
      raw: inflationAdjustedValue,
      description: `Equivalent purchasing power in today's money at ${inflationRate}% inflation.`,
      highlight: true,
      color: '#f59e0b',
    });
    cards.push({
      label: 'Purchasing Power Loss',
      value: formatCurrency(purchasingPowerLoss),
      raw: purchasingPowerLoss,
      color: '#ef4444',
    });
  }

  return {
    type: 'cards',
    cards,
    chart: {
      type: 'area',
      title: 'Wealth Growth Trajectory',
      data: yearlyData,
      dataKeys: ['invested', 'value'],
      labels: ['Total Invested', 'Portfolio Value'],
    },
  };
}

function calcBMI(inputs) {
  const weight = Number(inputs.weight || 0);
  const heightCm = Number(inputs.height_cm || 0);
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);

  let category = '';
  let color = '';
  if (bmi < 18.5)      { category = 'Underweight'; color = '#3b82f6'; }
  else if (bmi < 25)   { category = 'Normal Weight'; color = '#22c55e'; }
  else if (bmi < 30)   { category = 'Overweight'; color = '#f59e0b'; }
  else                 { category = 'Obese'; color = '#ef4444'; }

  const idealMin = 18.5 * heightM * heightM;
  const idealMax = 24.9 * heightM * heightM;

  return {
    type: 'cards',
    cards: [
      { label: 'BMI Score', value: bmi.toFixed(1), raw: bmi, highlight: true, color },
      { label: 'Category', value: category, raw: category, color },
      { label: 'Ideal Weight Range', value: `${idealMin.toFixed(1)} – ${idealMax.toFixed(1)} kg`, raw: idealMin },
      { label: 'Height', value: `${heightCm} cm`, raw: heightCm },
    ],
    chart: {
      type: 'gauge',
      value: bmi,
      min: 10,
      max: 40,
      zones: [
        { from: 10, to: 18.5, color: '#3b82f6', label: 'Underweight' },
        { from: 18.5, to: 25, color: '#22c55e', label: 'Normal' },
        { from: 25, to: 30, color: '#f59e0b', label: 'Overweight' },
        { from: 30, to: 40, color: '#ef4444', label: 'Obese' },
      ],
    },
  };
}

function calcAge(inputs) {
  const dob = new Date(inputs.dob || inputs.date_of_birth || '');
  if (isNaN(dob)) return { error: 'Invalid date' };
  const now = new Date();
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  const days = now.getDate() - dob.getDate();

  let ageYears = years, ageMonths = months, ageDays = days;
  if (ageDays < 0) {
    ageMonths--;
    ageDays += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (ageMonths < 0) { ageYears--; ageMonths += 12; }

  const totalDays = Math.floor((now - dob) / 86400000);
  const nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBirthday < now) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  const daysToNext = Math.ceil((nextBirthday - now) / 86400000);

  return {
    type: 'cards',
    cards: [
      { label: 'Age', value: `${ageYears} years, ${ageMonths} months, ${ageDays} days`, raw: ageYears, highlight: true },
      { label: 'Total Days Lived', value: totalDays.toLocaleString(), raw: totalDays },
      { label: 'Total Hours', value: (totalDays * 24).toLocaleString(), raw: totalDays * 24 },
      { label: 'Days to Birthday', value: daysToNext === 365 ? 'Today! 🎂' : `${daysToNext} days`, raw: daysToNext },
    ],
  };
}

function calcCGPA(inputs) {
  const text = inputs.grades || '';
  const entries = text.split('\n').map(l => l.trim()).filter(Boolean);
  let totalPoints = 0, totalCredits = 0;
  const rows = [];

  for (const entry of entries) {
    const parts = entry.split(/[\s,]+/);
    if (parts.length >= 2) {
      const grade = parseFloat(parts[0]);
      const credits = parseFloat(parts[1]);
      if (!isNaN(grade) && !isNaN(credits)) {
        totalPoints += grade * credits;
        totalCredits += credits;
        rows.push({ Grade: grade, Credits: credits, Points: (grade * credits).toFixed(2) });
      }
    }
  }

  const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const percentage = cgpa * 9.5;

  return {
    type: 'cards',
    cards: [
      { label: 'CGPA', value: cgpa.toFixed(2), raw: cgpa, highlight: true, description: 'Weighted average across all credits' },
      { label: 'Percentage Equivalent', value: `${percentage.toFixed(1)}%`, raw: percentage, description: 'Standard conversion using 9.5 multiplier' },
      { label: 'Total Credits', value: totalCredits.toLocaleString(), raw: totalCredits },
      { label: 'Performance', value: getAcademicRemark(percentage), raw: percentage },
    ],
    table: rows,
  };
}

function calcGPA(inputs) {
  const pairs = parseNumericPairs(inputs.grades || '');
  if (pairs.length === 0) return { error: 'Enter grade and credit pairs one per line.' };

  const scale = Number(inputs.gpa_scale || 10);
  let totalPoints = 0;
  let totalCredits = 0;

  pairs.forEach(([grade, credits]) => {
    totalPoints += grade * credits;
    totalCredits += credits;
  });

  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const percentage = scale === 4 ? gpa * 25 : gpa * 9.5;

  return {
    type: 'cards',
    cards: [
      { label: 'Weighted GPA', value: gpa.toFixed(2), raw: gpa, highlight: true, description: `${scale}.0 scale` },
      { label: 'Total Credits', value: totalCredits, raw: totalCredits },
      { label: 'Estimated Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage },
      { label: 'Grade Summary', value: getAcademicRemark(percentage), raw: percentage },
    ],
  };
}

function calcSGPA(inputs) {
  const pairs = parseNumericPairs(inputs.grades || '');
  if (pairs.length === 0) return { error: 'Enter grade and credit pairs one per line.' };

  const scale = Number(inputs.gpa_scale || 10);
  let totalPoints = 0;
  let totalCredits = 0;

  pairs.forEach(([grade, credits]) => {
    totalPoints += grade * credits;
    totalCredits += credits;
  });

  const sgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  const percentage = scale === 4 ? sgpa * 25 : sgpa * 9.5;

  return {
    type: 'cards',
    cards: [
      { label: 'Semester GPA', value: sgpa.toFixed(2), raw: sgpa, highlight: true },
      { label: 'Total Semester Credits', value: totalCredits, raw: totalCredits },
      { label: 'Estimated Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage },
      { label: 'Grade Summary', value: getAcademicGradeLabel(percentage), raw: percentage },
    ],
  };
}

function calcAttendance(inputs) {
  const attended = Number(inputs.classes_attended || 0);
  const total = Number(inputs.total_classes || 0);
  const target = Number(inputs.target_attendance || 75);

  if (total <= 0) return { error: 'Total classes must be greater than zero.' };

  const percent = (attended / total) * 100;
  const needed = target > percent ? Math.ceil((target / 100 * total - attended) / (1 - target / 100)) : 0;
  const canMiss = percent > target ? Math.floor((attended - target / 100 * total) / (target / 100)) : 0;

  return {
    type: 'cards',
    cards: [
      { label: 'Attendance Percentage', value: `${percent.toFixed(1)}%`, raw: percent, highlight: true },
      { label: 'Target Attendance', value: `${target}%`, raw: target },
      { label: 'Classes Needed', value: needed > 0 ? `${needed} more` : 'Target reached', raw: needed },
      { label: 'Safe to Miss', value: canMiss > 0 ? `${canMiss} classes` : 'None', raw: canMiss },
    ],
  };
}

function calcMarksPercentage(inputs) {
  const pairs = parseNumericPairs(inputs.marks || '');
  if (pairs.length === 0) return { error: 'Enter obtained and total marks per subject, one per line.' };

  let totalObtained = 0;
  let totalMax = 0;
  const rows = [];

  pairs.forEach(([obtained, max]) => {
    totalObtained += obtained;
    totalMax += max;
    rows.push({ Obtained: obtained, Total: max, Percentage: `${((obtained / max) * 100).toFixed(1)}%` });
  });

  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const grade = getAcademicGradeLabel(percentage);

  return {
    type: 'cards',
    cards: [
      { label: 'Total Obtained', value: totalObtained.toLocaleString(), raw: totalObtained, highlight: true },
      { label: 'Total Maximum', value: totalMax.toLocaleString(), raw: totalMax },
      { label: 'Overall Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage },
      { label: 'Grade Estimate', value: grade, raw: percentage },
    ],
    table: rows,
  };
}

function calcFinalGrade(inputs) {
  const current = Number(inputs.current_grade || 0);
  const desired = Number(inputs.desired_grade || 0);
  const examWeight = Number(inputs.exam_weight || 0);
  const currentWeight = Number(inputs.current_weight || Math.max(0, 100 - examWeight));

  if (examWeight <= 0 || examWeight >= 100) return { error: 'Exam weight must be between 1 and 99.' };
  if (currentWeight + examWeight !== 100) return { error: 'Current and exam weights must sum to 100.' };

  const requiredScore = ((desired - (current * currentWeight / 100)) * 100) / examWeight;
  const capped = Math.max(0, Math.min(100, requiredScore));
  const possible = requiredScore <= 100;

  return {
    type: 'cards',
    cards: [
      { label: 'Required Exam Score', value: `${capped.toFixed(1)}%`, raw: capped, highlight: true, description: possible ? 'Score needed on the final exam' : 'More than 100% – target may be unreachable' },
      { label: 'Current Contribution', value: `${(current * currentWeight / 100).toFixed(1)}%`, raw: current * currentWeight / 100 },
      { label: 'Target Final Grade', value: `${desired.toFixed(1)}%`, raw: desired },
      { label: 'Outcome', value: possible ? 'Possible' : 'Challenging', raw: possible ? 1 : 0 },
    ],
  };
}

function calcGrade(inputs) {
  const percentage = Number(inputs.percentage || 0);
  const scale = Number(inputs.grade_scale || 10);
  if (percentage < 0 || percentage > 100) return { error: 'Enter a percentage between 0 and 100.' };

  const grade = getAcademicGradeLabel(percentage);
  const gpa = scale === 10 ? (percentage / 10) : (percentage / 25);

  return {
    type: 'cards',
    cards: [
      { label: 'Letter Grade', value: grade, raw: percentage, highlight: true },
      { label: `${scale}.0 GPA Equivalent`, value: gpa.toFixed(2), raw: gpa },
      { label: 'Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage },
      { label: 'Performance', value: getAcademicRemark(percentage), raw: percentage },
    ],
  };
}

function calcStudyTime(inputs) {
  const target = Number(inputs.target_hours || 0);
  const days = Number(inputs.available_days || 1);
  const dailyGoal = Number(inputs.daily_goal || 0);

  if (target <= 0 || days <= 0) return { error: 'Enter realistic study hours and available days.' };

  const hoursPerDay = target / days;
  const weekly = hoursPerDay * 7;

  return {
    type: 'cards',
    cards: [
      { label: 'Recommended Daily Hours', value: `${hoursPerDay.toFixed(1)}h`, raw: hoursPerDay, highlight: true },
      { label: 'Weekly Study Estimate', value: `${weekly.toFixed(1)}h`, raw: weekly },
      { label: 'Total Study Hours', value: `${target.toFixed(1)}h`, raw: target },
      { label: 'Optional Goal', value: dailyGoal > 0 ? `${dailyGoal.toFixed(1)}h per day` : 'No specific daily goal', raw: dailyGoal },
    ],
  };
}

function calcExamScore(inputs) {
  const maxMarks = Number(inputs.maximum_marks || 0);
  const current = Number(inputs.current_marks || 0);
  const passPercent = Number(inputs.passing_percentage || 40);
  const targetPercent = Number(inputs.target_percentage || 60);

  if (maxMarks <= 0) return { error: 'Maximum marks must be greater than zero.' };

  const currentPercent = (current / maxMarks) * 100;
  const passThreshold = (passPercent / 100) * maxMarks;
  const targetThreshold = (targetPercent / 100) * maxMarks;
  const neededToPass = Math.max(0, Math.ceil(passThreshold - current));
  const neededToTarget = Math.max(0, Math.ceil(targetThreshold - current));

  return {
    type: 'cards',
    cards: [
      { label: 'Current Percentage', value: `${currentPercent.toFixed(1)}%`, raw: currentPercent, highlight: true },
      { label: 'Marks to Pass', value: neededToPass > 0 ? `${neededToPass} marks` : 'Already passed', raw: neededToPass },
      { label: 'Marks to Target', value: neededToTarget > 0 ? `${neededToTarget} marks` : 'Target achieved', raw: neededToTarget },
      { label: 'Predicted Grade', value: getAcademicGradeLabel(currentPercent), raw: currentPercent },
    ],
  };
}

function calcSemesterPlanner(inputs) {
  const rows = parseWorkloadLines(inputs.subjects || '');
  const weeks = Number(inputs.study_weeks || 1);
  if (rows.length === 0) return { error: 'Enter subject workload entries one per line.' };
  if (weeks <= 0) return { error: 'Study weeks must be greater than zero.' };

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const perWeek = totalHours / weeks;
  const perDay = perWeek / 7;

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Weekly Hours', value: `${perWeek.toFixed(1)}h`, raw: perWeek, highlight: true },
      { label: 'Estimated Daily Hours', value: `${perDay.toFixed(1)}h`, raw: perDay },
      { label: 'Total Workload', value: `${totalHours.toFixed(1)}h`, raw: totalHours },
      { label: 'Study Weeks', value: weeks, raw: weeks },
    ],
    table: rows.map(r => ({ Subject: r.name, Hours: r.hours })),
  };
}

function calcCredit(inputs) {
  const completed = Number(inputs.completed_credits || 0);
  const required = Number(inputs.total_required_credits || 0);
  const semester = Number(inputs.semester_credits || 0);

  if (required <= 0) return { error: 'Total required credits must be greater than zero.' };
  const remaining = Math.max(0, required - completed);
  const progress = Math.min(100, (completed / required) * 100);

  return {
    type: 'cards',
    cards: [
      { label: 'Completed Credits', value: completed.toLocaleString(), raw: completed, highlight: true },
      { label: 'Remaining Credits', value: remaining.toLocaleString(), raw: remaining },
      { label: 'Degree Progress', value: `${progress.toFixed(1)}%`, raw: progress },
      { label: 'This Semester Credits', value: semester > 0 ? semester.toLocaleString() : 'N/A', raw: semester },
    ],
  };
}

function calcBacklog(inputs) {
  const failed = Number(inputs.failed_subjects || 0);
  const pending = Number(inputs.pending_credits || 0);
  const semesters = Math.max(1, Number(inputs.remaining_semesters || 1));
  const currentCgpa = Number(inputs.current_cgpa || 0);

  if (pending <= 0) return { error: 'Pending credits must be greater than zero.' };

  const perSemester = Math.ceil(pending / semesters);
  const estimatedImprovement = currentCgpa > 0 ? Math.max(0, 0.1 * semesters) : 0;

  return {
    type: 'cards',
    cards: [
      { label: 'Failed Subjects', value: failed.toLocaleString(), raw: failed, highlight: true },
      { label: 'Pending Credits', value: pending.toLocaleString(), raw: pending },
      { label: 'Credits per Semester', value: `${perSemester}`, raw: perSemester },
      { label: 'Estimated CGPA Impact', value: currentCgpa > 0 ? `+${estimatedImprovement.toFixed(1)}` : 'N/A', raw: estimatedImprovement },
    ],
  };
}

function calcCgpaToPercentage(inputs) {
  const cgpa = Number(inputs.cgpa || 0);
  const factor = Number(inputs.conversion_factor || 9.5);
  if (cgpa <= 0) return { error: 'Enter a valid CGPA value.' };

  const percentage = cgpa * factor;
  return {
    type: 'cards',
    cards: [
      { label: 'CGPA', value: cgpa.toFixed(2), raw: cgpa, highlight: true },
      { label: 'Conversion Factor', value: factor.toFixed(2), raw: factor },
      { label: 'Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage },
    ],
  };
}

function calcPercentageToCgpa(inputs) {
  const percentage = Number(inputs.percentage || 0);
  const factor = Number(inputs.conversion_factor || 9.5);
  const scale = Number(inputs.cgpa_scale || 10);
  if (percentage < 0 || percentage > 100) return { error: 'Enter a percentage between 0 and 100.' };

  const cgpa = (percentage / factor) * (scale / 10);
  return {
    type: 'cards',
    cards: [
      { label: 'Percentage', value: `${percentage.toFixed(1)}%`, raw: percentage, highlight: true },
      { label: 'Conversion Factor', value: factor.toFixed(2), raw: factor },
      { label: `${scale}.0 CGPA`, value: cgpa.toFixed(2), raw: cgpa },
    ],
  };
}

function calcCutoff(inputs) {
  const score = Number(inputs.jee_score || 0);
  const category = (inputs.category || 'general').toLowerCase();
  const weight = Number(inputs.weighting || 60);
  if (score < 0) return { error: 'Enter a valid JEE score.' };

  const categoryAdjustments = { general: 0, obc: 2, 'sc/st': 5 };
  const adjustment = categoryAdjustments[category] ?? 0;
  const percentile = Math.min(100, Math.max(0, (score / 360) * 100));
  const estimatedCutoff = Math.max(0, Math.min(100, percentile + adjustment + weight / 10));
  const rankEstimate = Math.round((100 - percentile) * 1000);

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Cutoff', value: `${estimatedCutoff.toFixed(1)}%`, raw: estimatedCutoff, highlight: true },
      { label: 'Category Adjustment', value: `${adjustment}%`, raw: adjustment },
      { label: 'Estimated Percentile', value: `${percentile.toFixed(1)}%`, raw: percentile },
      { label: 'Rank Estimate', value: rankEstimate.toLocaleString(), raw: rankEstimate },
    ],
  };
}

function calcCollegeFees(inputs) {
  const tuition = Number(inputs.tuition_fees || 0);
  const hostel = Number(inputs.hostel_fees || 0);
  const transport = Number(inputs.transport_fees || 0);
  const scholarship = Number(inputs.scholarship_amount || 0);
  const other = Number(inputs.other_fees || 0);

  const total = Math.max(0, tuition + hostel + transport + other - scholarship);
  const monthly = total / 12;

  return {
    type: 'cards',
    cards: [
      { label: 'Net Annual Cost', value: formatCurrency(total), raw: total, highlight: true },
      { label: 'Monthly Equivalent', value: formatCurrency(monthly), raw: monthly },
      { label: 'Scholarship Saved', value: formatCurrency(scholarship), raw: scholarship },
      { label: 'Total Fees Before Aid', value: formatCurrency(tuition + hostel + transport + other), raw: tuition + hostel + transport + other },
    ],
  };
}

function parseNumericPairs(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const tokens = line.split(/[\s,]+/).filter(Boolean);
      const numbers = tokens.filter(token => token !== '' && !isNaN(Number(token))).map(Number);
      return numbers.length >= 2 ? [numbers[0], numbers[1]] : null;
    })
    .filter(Boolean);
}

function parseWorkloadLines(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const tokens = line.split(/[\s,]+/).filter(Boolean);
      const numbers = tokens.filter(token => token !== '' && !isNaN(Number(token)));
      if (numbers.length === 0) return null;
      const hours = Number(numbers[numbers.length - 1]);
      const name = line.slice(0, line.lastIndexOf(String(numbers[numbers.length - 1]))).trim() || 'Subject';
      return { name, hours: isNaN(hours) ? 0 : hours };
    })
    .filter(Boolean);
}

function getAcademicGradeLabel(value) {
  const percent = Math.min(100, Math.max(0, Number(value)));
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B+';
  if (percent >= 60) return 'B';
  if (percent >= 50) return 'C';
  if (percent >= 40) return 'D';
  return 'F';
}

function getAcademicRemark(value) {
  const percent = Math.min(100, Math.max(0, Number(value)));
  if (percent >= 90) return 'Outstanding';
  if (percent >= 80) return 'Excellent';
  if (percent >= 70) return 'Strong';
  if (percent >= 60) return 'Good';
  if (percent >= 50) return 'Steady';
  if (percent >= 40) return 'Below Average';
  return 'Needs Improvement';
}

function calcGST(inputs) {
  const amount = Number(inputs.amount || 0);
  const rate   = Number(inputs.gst_rate || 18);
  const type   = inputs.calculation_type || 'exclusive';
  const origin = inputs.origin_state || 'Tamil Nadu';
  const destination = inputs.destination_state || 'Tamil Nadu';

  if (amount <= 0 || rate <= 0) {
    return { error: 'Please enter a valid amount and GST rate.' };
  }

  let base, gst, total;
  
  const isExportOrImport = origin === 'Outside India' || destination === 'Outside India';
  
  if (isExportOrImport) {
    // International export/import (Zero-rated under GST rules generally)
    if (type === 'exclusive') {
      base = amount;
      gst = 0;
      total = amount;
    } else {
      total = amount;
      base = amount;
      gst = 0;
    }
  } else {
    if (type === 'exclusive') {
      base  = amount;
      gst   = amount * rate / 100;
      total = amount + gst;
    } else {
      total = amount;
      base  = amount / (1 + rate / 100);
      gst   = total - base;
    }
  }

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let txType = 'Inter-state';

  if (isExportOrImport) {
    txType = 'International (Zero-Rated / Exempt)';
  } else if (origin === destination) {
    txType = 'Intra-state (Local)';
    cgst = gst / 2;
    sgst = gst / 2;
  } else {
    txType = 'Inter-state (IGST)';
    igst = gst;
  }

  const cards = [
    { label: 'Total (incl. GST)', value: formatCurrency(total), raw: total, highlight: true },
    { label: 'Base Amount', value: formatCurrency(base), raw: base },
    { label: 'GST Rate', value: `${rate}%`, raw: rate },
    { label: 'Total GST Tax', value: formatCurrency(gst), raw: gst },
  ];

  if (isExportOrImport) {
    cards.push({ label: 'Transaction Type', value: txType, raw: txType, color: '#f59e0b' });
    cards.push({ label: 'IGST (Zero-Rated)', value: formatCurrency(0), raw: 0 });
  } else if (origin === destination) {
    cards.push({ label: 'Transaction Type', value: txType, raw: txType });
    cards.push({ label: `CGST (${rate / 2}%)`, value: formatCurrency(cgst), raw: cgst });
    cards.push({ label: `SGST (${rate / 2}%)`, value: formatCurrency(sgst), raw: sgst });
  } else {
    cards.push({ label: 'Transaction Type', value: txType, raw: txType });
    cards.push({ label: `IGST (${rate}%)`, value: formatCurrency(igst), raw: igst });
  }

  const ledgerTable = [
    { Item: 'Gross Amount', Value: formatCurrency(amount) },
    { Item: 'GST Rate Applied', Value: `${rate}%` },
    { Item: 'Calculation Mode', Value: type.charAt(0).toUpperCase() + type.slice(1) },
    { Item: 'Supply Origin', Value: origin },
    { Item: 'Supply Destination', Value: destination },
    { Item: 'Transaction Classification', Value: txType },
    { Item: 'Taxable Base Value', Value: formatCurrency(base) },
    { Item: 'CGST Component', Value: formatCurrency(cgst) },
    { Item: 'SGST Component', Value: formatCurrency(sgst) },
    { Item: 'IGST Component', Value: formatCurrency(igst) },
    { Item: 'Total GST Paid', Value: formatCurrency(gst) },
    { Item: 'Net Maturity Invoice Value', Value: formatCurrency(total) },
  ];

  return {
    type: 'cards',
    cards,
    table: ledgerTable,
  };
}

const ZODIAC_DATA = [
  { sign: 'Aries', element: 'Fire', color: '#fb7185' },
  { sign: 'Taurus', element: 'Earth', color: '#34d399' },
  { sign: 'Gemini', element: 'Air', color: '#60a5fa' },
  { sign: 'Cancer', element: 'Water', color: '#38bdf8' },
  { sign: 'Leo', element: 'Fire', color: '#f97316' },
  { sign: 'Virgo', element: 'Earth', color: '#4ade80' },
  { sign: 'Libra', element: 'Air', color: '#a78bfa' },
  { sign: 'Scorpio', element: 'Water', color: '#f43f5e' },
  { sign: 'Sagittarius', element: 'Fire', color: '#f59e0b' },
  { sign: 'Capricorn', element: 'Earth', color: '#64748b' },
  { sign: 'Aquarius', element: 'Air', color: '#22d3ee' },
  { sign: 'Pisces', element: 'Water', color: '#6366f1' },
];

function getSignInfo(sign) {
  return ZODIAC_DATA.find(item => item.sign.toLowerCase() === String(sign || '').trim().toLowerCase()) || { sign: 'Unknown', element: 'Neutral', color: '#8b5cf6' };
}

function zodiacAffinity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 18;
  const matrix = {
    Fire: { Fire: 18, Air: 12, Earth: -6, Water: -12 },
    Earth: { Earth: 18, Water: 10, Fire: -4, Air: -8 },
    Air: { Air: 18, Fire: 10, Earth: -8, Water: -6 },
    Water: { Water: 18, Earth: 10, Air: -6, Fire: -10 },
  };
  return matrix[a]?.[b] ?? 0;
}

function buildSeedNumber(value) {
  return String(value || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function reduceToSingleDigit(value) {
  let num = Number(value);
  while (num > 9) {
    num = String(num).split('').reduce((sum, digit) => sum + Number(digit), 0);
  }
  return num;
}

function chooseTraits(number) {
  const traits = {
    1: ['Bold', 'Independent', 'Magnetic'],
    2: ['Caring', 'Diplomatic', 'Patient'],
    3: ['Creative', 'Joyful', 'Expressive'],
    4: ['Stable', 'Trustworthy', 'Practical'],
    5: ['Adventurous', 'Curious', 'Free-spirited'],
    6: ['Nurturing', 'Romantic', 'Loyal'],
    7: ['Intuitive', 'Reflective', 'Wise'],
    8: ['Powerful', 'Ambitious', 'Generous'],
    9: ['Compassionate', 'Visionary', 'Optimistic'],
  };
  return traits[number] || ['Unique', 'Balanced', 'Radiant'];
}

function makeRecommendations(number) {
  const names = {
    1: ['Aarav', 'Mira', 'Kian'],
    2: ['Sana', 'Noah', 'Lea'],
    3: ['Aria', 'Mia', 'Riya'],
    4: ['Ayaan', 'Emma', 'Neil'],
    5: ['Zara', 'Rohan', 'Mila'],
    6: ['Aisha', 'Leo', 'Nina'],
    7: ['Isha', 'Ayan', 'Zoe'],
    8: ['Arya', 'Rhea', 'Sam'],
    9: ['Sara', 'Noor', 'Jai'],
  };
  return names[number] || ['Luna', 'Arun', 'Tara'];
}

function scoreFromNamePair(a, b) {
  const letters = `${a}${b}`.toLowerCase().replace(/[^a-z]/g, '');
  return Array.from(letters).reduce((sum, char) => sum + (char.charCodeAt(0) % 9) + 1, 0);
}

function countCommonLetters(a, b) {
  const aChars = new Set(String(a || '').toLowerCase().replace(/[^a-z]/g, ''));
  const bChars = new Set(String(b || '').toLowerCase().replace(/[^a-z]/g, ''));
  return [...aChars].filter(ch => bChars.has(ch)).length;
}

function calcLovePercentage(inputs) {
  const yourName = String(inputs.your_name || '').trim();
  const partnerName = String(inputs.partner_name || '').trim();
  const yourSign = getSignInfo(inputs.your_zodiac);
  const partnerSign = getSignInfo(inputs.partner_zodiac);

  if (!yourName || !partnerName) return { error: 'Please enter both names to reveal love chemistry.' };

  const common = countCommonLetters(yourName, partnerName);
  const seed = buildSeedNumber(`${yourName}:${partnerName}:${yourSign.sign}:${partnerSign.sign}`);
  const loveBase = 42 + Math.min(common * 12, 24) + zodiacAffinity(yourSign.element, partnerSign.element);
  const loveScore = Math.min(99, Math.max(35, Math.round(loveBase + (seed % 12) - 6)));
  const luckyNumber = ((seed % 9) + 1);
  const luckyColor = yourSign.color || partnerSign.color || '#f472b6';
  const luckyDay = ['Friday', 'Saturday', 'Thursday', 'Monday', 'Wednesday'][seed % 5];
  const message = loveScore > 75
    ? `Your love spark is sizzling! ${yourSign.sign} and ${partnerSign.sign} are ready to light up the feed.`
    : loveScore > 55
      ? `Nice chemistry! A little extra charm and honest conversation will make your connection shine.`
      : `This pairing is playful and curious. Take it slow, share a laugh, and let the energy grow.`;

  const strengths = [
    'Heartfelt honesty',
    'Easy chemistry',
    'Shared intuition',
    'Dreamy spark',
    'Warm support',
  ].slice(0, 3);

  return {
    type: 'cards',
    cards: [
      { label: 'Love Compatibility', value: `${loveScore}%`, raw: loveScore, highlight: true, description: message },
      { label: 'Zodiac Bonus', value: `${zodiacAffinity(yourSign.element, partnerSign.element)} pts`, raw: zodiacAffinity(yourSign.element, partnerSign.element) },
      { label: 'Lucky Color', value: luckyColor, raw: luckyColor, color: luckyColor },
      { label: 'Lucky Number', value: String(luckyNumber), raw: luckyNumber },
      { label: 'Romantic Strength', value: strengths[0], raw: strengths[0] },
      { label: 'Trust Potential', value: `${Math.min(100, loveScore + 8)}%`, raw: Math.min(100, loveScore + 8) },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Romance', value: loveScore },
        { name: 'Trust', value: Math.min(100, loveScore + 8) },
        { name: 'Energy', value: Math.min(100, loveScore + 5) },
      ],
      dataKeys: ['value'],
    },
    extra: { confetti: true, color: luckyColor, message: message },
  };
}

function calcCrushCompatibility(inputs) {
  const yourName = String(inputs.your_name || '').trim();
  const crushName = String(inputs.crush_name || '').trim();
  const crushStyle = String(inputs.crush_style || 'Texting Crush');
  if (!yourName || !crushName) return { error: 'Please enter your name and your crush’s name.' };

  const seed = buildSeedNumber(`${yourName}:${crushName}:${crushStyle}`);
  const common = countCommonLetters(yourName, crushName);
  const base = 30 + Math.min(common * 10, 30) + ((seed % 20) - 5);
  const compatibility = Math.min(99, Math.max(22, Math.round(base + (yourName.length + crushName.length) % 10)));
  const texting = Math.min(100, Math.max(25, Math.round((compatibility * 0.8) + (common * 3))));
  const emotional = Math.min(100, Math.max(20, Math.round((compatibility * 0.7) + ((seed % 15)))));
  const success = compatibility > 68 ? 'High chance of a sweet moment soon.' : compatibility > 50 ? 'Keep the conversation going — the energy is warming up.' : 'Take it easy and build trust with small, playful messages.';

  const greenFlags = [];
  if (common >= 2) greenFlags.push('Shared name energy');
  if (yourName[0]?.toLowerCase() === crushName[0]?.toLowerCase()) greenFlags.push('Matching initials');
  if (compatibility > 70) greenFlags.push('Strong crush spark');
  if (greenFlags.length === 0) greenFlags.push('Curious curiosity');

  const conversation = [
    'Send a funny meme and ask what made them smile today.',
    'Mention a shared memory and ask about their favorite weekend plan.',
    'Ask for a song recommendation and share your current mood.',
  ][seed % 3];

  return {
    type: 'cards',
    cards: [
      { label: 'Crush Compatibility', value: `${compatibility}%`, raw: compatibility, highlight: true, description: success },
      { label: 'Texting Chemistry', value: `${texting}%`, raw: texting },
      { label: 'Emotional Match', value: `${emotional}%`, raw: emotional },
      { label: 'Best Conversation Starter', value: conversation, raw: conversation },
      { label: 'Green Flag', value: greenFlags[0], raw: greenFlags },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Crush', value: compatibility },
        { name: 'Texting', value: texting },
        { name: 'Emotion', value: emotional },
      ],
      dataKeys: ['value'],
    },
    extra: { confetti: compatibility > 70, message: success },
  };
}

function calcFriendship(inputs) {
  const yourName = String(inputs.your_name || '').trim();
  const friendName = String(inputs.friend_name || '').trim();
  const yearsKnown = Math.max(0, Number(inputs.years_known || 0));
  const style = String(inputs.personality_style || 'Supportive');

  if (!yourName || !friendName) return { error: 'Please enter both friend names to see your friendship score.' };

  const pairSeed = buildSeedNumber(`${yourName}:${friendName}:${style}`);
  const friendshipScore = Math.min(99, Math.max(30, Math.round(40 + Math.min(yearsKnown * 5, 35) + (pairSeed % 20) - 4)));
  const trustScore = Math.min(100, Math.max(30, Math.round(friendshipScore + yearsKnown * 2)));
  const longevity = yearsKnown >= 5 ? 'Forever Friends' : yearsKnown >= 2 ? 'Growing Bond' : 'Fresh Connection';
  const personality = `${style} duo`;
  const emoji = friendshipScore > 75 ? '🌟' : friendshipScore > 55 ? '🤝' : '💬';

  return {
    type: 'cards',
    cards: [
      { label: 'Friendship Score', value: `${friendshipScore}% ${emoji}`, raw: friendshipScore, highlight: true, description: personality },
      { label: 'Trust Score', value: `${trustScore}%`, raw: trustScore },
      { label: 'Longevity', value: longevity, raw: longevity },
      { label: 'Personality Match', value: style, raw: style },
      { label: 'Emoji Match', value: emoji, raw: emoji },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Friendship', value: friendshipScore },
        { name: 'Trust', value: trustScore },
        { name: 'Connection', value: Math.min(100, friendshipScore + 5) },
      ],
      dataKeys: ['value'],
    },
    extra: { confetti: friendshipScore > 80, message: `Your friendship is ${longevity.toLowerCase()}. Keep celebrating the bond!` },
  };
}

function calcZodiacCompatibility(inputs) {
  const yourSign = getSignInfo(inputs.your_sign);
  const partnerSign = getSignInfo(inputs.partner_sign);
  if (!yourSign.sign || !partnerSign.sign) return { error: 'Pick both zodiac signs to reveal astrological chemistry.' };

  const affinity = zodiacAffinity(yourSign.element, partnerSign.element);
  const base = 55 + affinity + (yourSign.sign === partnerSign.sign ? 10 : 0);
  const loveScore = Math.min(99, Math.max(28, Math.round(base + (buildSeedNumber(`${yourSign.sign}:${partnerSign.sign}`) % 12) - 5)));
  const friendshipScore = Math.min(99, Math.max(30, Math.round(base + 5 - (yourSign.element === partnerSign.element ? 0 : 8))));
  const workScore = Math.min(99, Math.max(25, Math.round(base - 5 + (yourSign.element === partnerSign.element ? 8 : -3))));
  const communication = Math.min(99, Math.max(35, Math.round((loveScore + friendshipScore) / 2 + 5)));
  const luckyDays = ['Friday', 'Tuesday', 'Thursday', 'Monday', 'Saturday'][buildSeedNumber(yourSign.sign + partnerSign.sign) % 5];
  const strengths = yourSign.element === partnerSign.element ? 'Aligned elemental energy' : 'Magnetic contrast';
  const weakness = affinity < 0 ? 'Needs honesty and space' : 'Too much intensity can overwhelm';

  return {
    type: 'cards',
    cards: [
      { label: 'Love Compatibility', value: `${loveScore}%`, raw: loveScore, highlight: true },
      { label: 'Friendship Harmony', value: `${friendshipScore}%`, raw: friendshipScore },
      { label: 'Work Balance', value: `${workScore}%`, raw: workScore },
      { label: 'Communication', value: `${communication}%`, raw: communication },
      { label: 'Lucky Day', value: luckyDays, raw: luckyDays },
      { label: 'Strength', value: strengths, raw: strengths },
      { label: 'Weakness', value: weakness, raw: weakness },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Love', value: loveScore },
        { name: 'Friendship', value: friendshipScore },
        { name: 'Work', value: workScore },
      ],
      dataKeys: ['value'],
    },
    extra: { color: yourSign.color, message: `${yourSign.sign} + ${partnerSign.sign} = ${strengths}` },
  };
}

function calcBabyNameNumerology(inputs) {
  const babyName = String(inputs.baby_name || '').trim();
  const birthYear = String(inputs.birth_year || '').trim();
  if (!babyName) return { error: 'Enter a baby name to discover numerology insights.' };

  const letters = babyName.toUpperCase().replace(/[^A-Z]/g, '');
  const letterMap = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
  const total = Array.from(letters).reduce((sum, letter) => sum + (letterMap[letter] || 0), 0);
  const destiny = reduceToSingleDigit(total);
  const soul = reduceToSingleDigit(Array.from(letters).filter(c => 'AEIOU'.includes(c)).reduce((sum, letter) => sum + (letterMap[letter] || 0), 0));
  const personality = reduceToSingleDigit(Array.from(letters).filter(c => !'AEIOU'.includes(c)).reduce((sum, letter) => sum + (letterMap[letter] || 0), 0));
  const luckyLetters = Array.from(new Set(letters.split('').filter(letter => [1, 3, 5, 6].includes(letterMap[letter])))).slice(0, 4).join(', ') || letters.slice(0, 3);
  const colors = ['Rose', 'Aqua', 'Gold', 'Emerald', 'Violet', 'Pearl', 'Coral', 'Indigo', 'Sunset'];
  const luckyColor = colors[destiny - 1] || 'Jade';
  const traits = chooseTraits(destiny).join(', ');
  const recommendations = makeRecommendations(destiny).join(', ');
  const yearValue = birthYear ? reduceToSingleDigit(birthYear.split('').reduce((sum, digit) => sum + Number(digit || 0), 0)) : null;

  return {
    type: 'cards',
    cards: [
      { label: 'Baby Name', value: babyName, raw: babyName, highlight: true },
      { label: 'Destiny Number', value: String(destiny), raw: destiny },
      { label: 'Soul Number', value: String(soul), raw: soul },
      { label: 'Personality Number', value: String(personality), raw: personality },
      { label: 'Lucky Letters', value: luckyLetters, raw: luckyLetters },
      { label: 'Lucky Color', value: luckyColor, raw: luckyColor },
      { label: 'Positive Traits', value: traits, raw: traits },
      { label: 'Name Recommendations', value: recommendations, raw: recommendations },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Destiny', value: destiny },
        { name: 'Soul', value: soul },
        { name: 'Personality', value: personality },
      ],
      dataKeys: ['value'],
    },
    extra: { color: '#f472b6', message: yearValue ? `Year energy adds a ${yearValue}-vibration glow to the name.` : 'Tap share to save this magical numerology report.' },
  };
}

function calcPercentage(inputs) {
  const value = Number(inputs.value || 0);
  const percent = Number(inputs.percentage || 0);
  const obtained = Number(inputs.obtained_marks || 0);
  const total = Number(inputs.total_marks || 0);
  const reversePct = Number(inputs.reverse_percentage || 0);
  const baseValue = Number(inputs.base_value || 0);

  const result = (value * percent) / 100;
  const increased = value + result;
  const decreased = value - result;
  const marksPercentage = total > 0 ? (obtained / total) * 100 : null;
  const reverseOriginal = reversePct > 0 && baseValue > 0 ? (baseValue * 100) / (100 - reversePct) : null;

  const cards = [
    { label: `${percent}% of ${formatNumber(value)}`, value: formatNumber(result), raw: result, highlight: true },
    { label: 'Value after increase', value: formatNumber(increased), raw: increased },
    { label: 'Value after decrease', value: formatNumber(decreased), raw: decreased },
  ];

  if (total > 0) {
    cards.push({ label: 'Marks Percentage', value: `${marksPercentage.toFixed(1)}%`, raw: marksPercentage });
  }
  if (obtained > 0 || total > 0) {
    cards.push({ label: 'Marks Obtained', value: `${obtained}/${total}`, raw: obtained });
  }
  if (reverseOriginal) {
    cards.push({ label: 'Original Value Before Change', value: formatNumber(reverseOriginal), raw: reverseOriginal });
  }

  return {
    type: 'cards',
    cards,
  };
}

function calcDiscount(inputs) {
  const original = Number(inputs.original_price || 0);
  const discount = Number(inputs.discount_percent || 0);
  const saved    = (original * discount) / 100;
  const final    = original - saved;
  return {
    type: 'cards',
    cards: [
      { label: 'Final Price', value: formatCurrency(final), raw: final, highlight: true },
      { label: 'You Save', value: formatCurrency(saved), raw: saved },
      { label: 'Discount', value: `${discount}%`, raw: discount },
    ],
  };
}

function calcCompoundInterest(inputs) {
  const P = Number(inputs.principal || 0);
  const annualRate = Number(inputs.rate || 0);
  const years = Number(inputs.time_years || 0);
  const depositType = inputs.deposit_type || 'Lumpsum (One-time)';
  const n = Number(inputs.compound_frequency || 4); // Compounding periods per year
  const taxSlab = Number(inputs.tax_slab || 0);

  if (P <= 0 || annualRate <= 0 || years <= 0) {
    return { error: 'Please enter valid details (Amount, Rate, and Tenure).' };
  }

  const r = annualRate / 100;
  
  // Simulation variables
  let balance = depositType === 'Recurring (RD)' ? 0 : P;
  let totalInvested = depositType === 'Recurring (RD)' ? 0 : P;
  let accumulatedInterest = 0;
  let uncompoundedInterest = 0;
  
  const months = years * 12;
  const yearlyData = [];

  for (let i = 1; i <= months; i++) {
    if (depositType === 'Recurring (RD)') {
      balance += P;
      totalInvested += P;
    }

    // Monthly interest calculation on current balance
    const monthlyInt = balance * (r / 12);
    uncompoundedInterest += monthlyInt;

    // Trigger compounding based on frequency
    const shouldCompound = (n >= 12) || (i % Math.round(12 / n) === 0) || (i === months);
    if (shouldCompound) {
      balance += uncompoundedInterest;
      accumulatedInterest += uncompoundedInterest;
      uncompoundedInterest = 0;
    }

    // Capture end-of-year data points for the growth chart
    if (i % 12 === 0) {
      const yearIndex = i / 12;
      yearlyData.push({
        name: `Year ${yearIndex}`,
        invested: totalInvested,
        value: Math.round(balance),
      });
    }
  }

  // Force compound any leftover interest at maturity
  if (uncompoundedInterest > 0) {
    balance += uncompoundedInterest;
    accumulatedInterest += uncompoundedInterest;
  }

  const preTaxMaturity = balance;
  const preTaxInterest = accumulatedInterest;
  const estimatedTax = preTaxInterest * (taxSlab / 100);
  const postTaxMaturity = preTaxMaturity - estimatedTax;
  const postTaxInterest = preTaxInterest - estimatedTax;

  const cards = [
    { label: 'Total Invested Amount', value: formatCurrency(totalInvested), raw: totalInvested },
    { label: 'Maturity Amount (Pre-tax)', value: formatCurrency(preTaxMaturity), raw: preTaxMaturity },
    { label: 'Interest Earned (Pre-tax)', value: formatCurrency(preTaxInterest), raw: preTaxInterest },
  ];

  if (taxSlab > 0) {
    cards.push({ label: 'Net Maturity (Post-tax)', value: formatCurrency(postTaxMaturity), raw: postTaxMaturity, highlight: true });
    cards.push({ label: 'Estimated TDS/Tax (at ' + taxSlab + '%)', value: formatCurrency(estimatedTax), raw: estimatedTax, color: '#ef4444' });
    cards.push({ label: 'Net Interest Earned', value: formatCurrency(postTaxInterest), raw: postTaxInterest, color: '#22c55e' });
  } else {
    // If no tax slab, highlight pre-tax maturity as final
    cards[1].highlight = true;
  }

  // Format yearly table for compound interest schedule
  const tableData = yearlyData.map((y, index) => {
    const yr = index + 1;
    // Estimate pre-tax value and invested for this year
    const yrInvested = y.invested;
    const yrValue = y.value;
    const yrInterest = yrValue - yrInvested;
    return {
      Year: `Year ${yr}`,
      'Total Invested': formatCurrency(yrInvested),
      'Accumulated Interest': formatCurrency(yrInterest),
      'Portfolio Value': formatCurrency(yrValue),
    };
  });

  const chartData = [
    { name: 'Total Invested', value: Math.round(totalInvested) },
    { name: 'Net Earnings', value: Math.round(postTaxInterest) },
  ];

  if (estimatedTax > 0) {
    chartData.push({ name: 'Tax Paid', value: Math.round(estimatedTax) });
  }

  return {
    type: 'cards',
    cards,
    chart: {
      type: 'pie',
      title: 'Compounding Investment Split',
      data: chartData,
    },
    table: tableData,
  };
}

function calcSimpleInterest(inputs) {
  const P = Number(inputs.principal || 0);
  const r = Number(inputs.rate || 0);
  const t = Number(inputs.time_years || 0);
  const SI = (P * r * t) / 100;
  const A = P + SI;
  return {
    type: 'cards',
    cards: [
      { label: 'Simple Interest', value: formatCurrency(SI), raw: SI, highlight: true },
      { label: 'Total Amount', value: formatCurrency(A), raw: A },
      { label: 'Principal', value: formatCurrency(P), raw: P },
    ],
  };
}

function calcTip(inputs) {
  const bill = Number(inputs.bill_amount || 0);
  const tipPct = Number(inputs.tip_percent || 15);
  const people = Number(inputs.people || 1);
  const tip = (bill * tipPct) / 100;
  const total = bill + tip;
  return {
    type: 'cards',
    cards: [
      { label: 'Tip Amount', value: formatCurrency(tip), raw: tip, highlight: true },
      { label: 'Total Bill', value: formatCurrency(total), raw: total },
      { label: 'Per Person', value: formatCurrency(total / people), raw: total / people },
    ],
  };
}

function calcFuelCost(inputs) {
  const distance = Number(inputs.distance_km || 0);
  const efficiency = Number(inputs.fuel_efficiency || 15);
  const price = Number(inputs.fuel_price || 0);
  const liters = distance / Math.max(efficiency, 0.001);
  const cost = liters * price;
  return {
    type: 'cards',
    cards: [
      { label: 'Total Cost', value: formatCurrency(cost), raw: cost, highlight: true },
      { label: 'Fuel Required', value: `${liters.toFixed(2)} L`, raw: liters },
      { label: 'Cost per km', value: formatCurrency(cost / Math.max(distance, 1)), raw: cost / Math.max(distance, 1) },
    ],
  };
}

function calcShippingCost(inputs) {
  const mappedInputs = {
    actual_weight: inputs.actual_weight || inputs.actual_weight_kg || 0,
    volumetric_weight: inputs.volumetric_weight || 0,
    distance_km: inputs.distance_km || 0,
    shipping_type: inputs.shipping_type || inputs.shipping_mode || 'standard',
    fuel_surcharge: inputs.fuel_surcharge || 0,
    insurance: inputs.insurance || 0,
  };
  
  if (!mappedInputs.volumetric_weight && inputs.length && inputs.width && inputs.height) {
    const l = Number(inputs.length);
    const w = Number(inputs.width);
    const h = Number(inputs.height);
    mappedInputs.volumetric_weight = (l * w * h) / 5000; 
  }

  const result = calculateShippingCost(mappedInputs);
  if (!result) return { error: 'Enter valid shipping details.' };

  return {
    type: 'cards',
    cards: [
      { label: 'Chargeable Weight', value: `${result.chargeableWeight.toFixed(2)} kg`, raw: result.chargeableWeight, highlight: true },
      { label: 'Base Charge', value: formatCurrency(result.baseCharge), raw: result.baseCharge },
      { label: 'Fuel Surcharge', value: formatCurrency(result.fuelSurcharge), raw: result.fuelSurcharge },
      { label: 'Insurance Charge', value: formatCurrency(result.insuranceCharge), raw: result.insuranceCharge },
      { label: 'Total Shipping Cost', value: formatCurrency(result.totalCharge), raw: result.totalCharge, description: 'Estimated shipping fee' },
      { label: 'Estimated Delivery', value: `${result.deliveryDays} days`, raw: result.deliveryDays },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Base Charge', value: Math.round(result.baseCharge) },
        { name: 'Fuel', value: Math.round(result.fuelSurcharge) },
        { name: 'Insurance', value: Math.round(result.insuranceCharge) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcCourierCharges(inputs) {
  const mappedInputs = {
    package_weight: inputs.package_weight || inputs.weight_kg || 0,
    parcel_type: inputs.parcel_type || 'standard',
    delivery_speed: inputs.delivery_speed || 'standard',
    distance: inputs.distance || inputs.distance_km || 0,
    cod_amount: inputs.cod_amount || 0
  };
  const result = calculateCourierCharges(mappedInputs);
  if (!result) return { error: 'Enter valid courier package details.' };

  const details = [
    { label: 'Base Charge', value: formatCurrency(result.baseCharge), raw: result.baseCharge },
    { label: 'Weight Surcharge', value: formatCurrency(result.weightSurcharge), raw: result.weightSurcharge },
    { label: 'Distance Charge', value: formatCurrency(result.distanceCharge), raw: result.distanceCharge },
  ];
  
  if (result.codFee > 0) {
    details.push({ label: 'COD Fee', value: formatCurrency(result.codFee), raw: result.codFee });
  }
  
  details.push(
    { label: 'Subtotal', value: formatCurrency(result.totalCharge), raw: result.totalCharge },
    { label: 'GST (18%)', value: formatCurrency(result.gst), raw: result.gst },
    { label: 'Final Charge', value: formatCurrency(result.finalCharge), raw: result.finalCharge, highlight: true, description: 'Total courier fee including tax' }
  );

  return {
    type: 'cards',
    cards: details,
    chart: {
      type: 'bar',
      data: [
        { name: 'Base', value: Math.round(result.baseCharge) },
        { name: 'Weight', value: Math.round(result.weightSurcharge) },
        { name: 'Distance', value: Math.round(result.distanceCharge) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcAirFreight(inputs) {
  const mappedInputs = {
    actual_weight: inputs.actual_weight || inputs.actual_weight_kg || 0,
    rate_per_kg: inputs.rate_per_kg || 0,
    volumetric_weight: inputs.volumetric_weight || 0,
    fuel_surcharge: inputs.fuel_surcharge || 0,
    customs_fee: inputs.customs_fee || 0
  };
  
  if (!mappedInputs.volumetric_weight && inputs.length && inputs.width && inputs.height) {
    const l = Number(inputs.length);
    const w = Number(inputs.width);
    const h = Number(inputs.height);
    mappedInputs.volumetric_weight = (l * w * h) / 5000;
  }
  const result = calculateAirFreight(mappedInputs);
  if (!result) return { error: 'Enter valid air freight details.' };

  return {
    type: 'cards',
    cards: [
      { label: 'Chargeable Weight', value: `${result.chargeableWeight.toFixed(2)} kg`, raw: result.chargeableWeight, highlight: true },
      { label: 'Rate per kg', value: formatCurrency(result.ratePerKg), raw: result.ratePerKg },
      { label: 'Freight Cost', value: formatCurrency(result.freightCost), raw: result.freightCost },
      { label: 'Fuel Surcharge', value: formatCurrency(result.fuelSurcharge), raw: result.fuelSurcharge },
      { label: 'Handling Charge', value: formatCurrency(result.handlingCharge), raw: result.handlingCharge },
      { label: 'Airport Charges', value: formatCurrency(result.airportCharge), raw: result.airportCharge },
      { label: 'Customs Fee', value: formatCurrency(result.customsFeeAmount), raw: result.customsFeeAmount },
      { label: 'GST (5%)', value: formatCurrency(result.gst), raw: result.gst },
      { label: 'Total Air Freight Cost', value: formatCurrency(result.totalCost), raw: result.totalCost, description: 'Complete air cargo cost' },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Freight', value: Math.round(result.freightCost) },
        { name: 'Fuel', value: Math.round(result.fuelSurcharge) },
        { name: 'Handling', value: Math.round(result.handlingCharge) },
        { name: 'Airport', value: Math.round(result.airportCharge) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcContainerLoad(inputs) {
  const mappedInputs = {
    package_length: inputs.package_length || inputs.package_length_cm || 0,
    package_width: inputs.package_width || inputs.package_width_cm || 0,
    package_height: inputs.package_height || inputs.package_height_cm || 0,
    quantity: inputs.quantity || 1,
    container_type: inputs.container_type || '20ft',
    unit: inputs.unit || 'cm'
  };
  const result = calculateContainerLoad(mappedInputs);
  if (!result) return { error: 'Enter valid container and package dimensions.' };

  return {
    type: 'cards',
    cards: [
      { label: 'Container Type', value: result.containerType.toUpperCase(), raw: result.containerType },
      { label: 'Container Volume', value: `${result.containerVolume} m³`, raw: result.containerVolume },
      { label: 'Package Quantity', value: `${result.quantity}`, raw: result.quantity },
      { label: 'Package Volume (each)', value: `${result.packageVolume.toFixed(3)} m³`, raw: result.packageVolume },
      { label: 'Total Packages Volume', value: `${result.totalPackageVolume.toFixed(3)} m³`, raw: result.totalPackageVolume },
      { label: 'Container Utilization', value: `${result.utilizationPercent.toFixed(1)}%`, raw: result.utilizationPercent, highlight: true },
      { label: 'Maximum Fit', value: `${result.maxFit} units`, raw: result.maxFit },
      { label: 'Unused Volume', value: `${result.unusedVolume.toFixed(2)} m³`, raw: result.unusedVolume },
      { label: 'Packages per CBM', value: `${result.packagesPerCBM}`, raw: result.packagesPerCBM },
      { label: 'Recommendation', value: result.recommendation, raw: result.recommendation },
    ],
    chart: {
      type: 'gauge',
      value: result.utilizationPercent,
      min: 0,
      max: 100,
      zones: [
        { from: 0, to: 50, color: '#f97316', label: 'Low' },
        { from: 50, to: 80, color: '#facc15', label: 'Good' },
        { from: 80, to: 100, color: '#22c55e', label: 'Optimal' },
      ],
    },
  };
}

function calcPackagingCost(inputs) {
  const result = calculatePackagingCost(inputs);
  if (!result) return { error: 'Enter valid packaging costs and quantity.' };

  return {
    type: 'cards',
    cards: [
      { label: 'Quantity', value: `${result.quantity}`, raw: result.quantity },
      { label: 'Cost per Unit', value: formatCurrency(result.costPerUnit), raw: result.costPerUnit, highlight: true },
      { label: 'Total Packaging Cost', value: formatCurrency(result.totalCost), raw: result.totalCost },
      { label: 'Estimated Monthly (20 shipments)', value: formatCurrency(result.monthlyCost), raw: result.monthlyCost },
      { label: 'Box Cost', value: formatCurrency(result.breakdown.box), raw: result.breakdown.box },
      { label: 'Tape Cost', value: formatCurrency(result.breakdown.tape), raw: result.breakdown.tape },
      { label: 'Filler Cost', value: formatCurrency(result.breakdown.filler), raw: result.breakdown.filler },
      { label: 'Label Cost', value: formatCurrency(result.breakdown.label), raw: result.breakdown.label },
    ],
    chart: {
      type: 'pie',
      data: [
        { name: 'Box', value: Math.round(result.breakdown.box) },
        { name: 'Tape', value: Math.round(result.breakdown.tape) },
        { name: 'Filler', value: Math.round(result.breakdown.filler) },
        { name: 'Label', value: Math.round(result.breakdown.label) },
      ],
    },
  };
}

function calcDeliveryTime(inputs) {
  const result = calculateDeliveryTime(inputs);
  if (!result) return { error: 'Enter valid delivery route details.' };

  return {
    type: 'cards',
    cards: [
      { label: 'Shipping Mode', value: result.description, raw: result.shippingMode, highlight: true },
      { label: 'Distance', value: `${result.distance} km`, raw: result.distance },
      { label: 'Estimated Transit Days', value: `${result.estimatedDays}`, raw: result.estimatedDays },
      { label: 'Minimum Arrival', value: result.minArrivalDate, raw: result.minDays },
      { label: 'Maximum Arrival', value: result.maxArrivalDate, raw: result.maxDays },
      { label: 'Delivery Window', value: `${result.minDays}-${result.maxDays} days`, raw: result.maxDays },
      { label: 'Service Reliability', value: `${result.reliability}%`, raw: result.reliability },
      { label: 'Note', value: result.trackingNote, raw: result.trackingNote },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Estimated', value: Math.round(result.estimatedDays * 10) },
        { name: 'Min Days', value: result.minDays * 10 },
        { name: 'Max Days', value: result.maxDays * 10 },
      ],
      dataKeys: ['value'],
    },
  };
}

function calculateSlabCharges(units, slabs) {
  let remaining = Math.max(0, units);
  const rows = [];
  let total = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const limit = Number(slab.limit || Infinity);
    const unitsInSlab = Math.min(remaining, limit);
    const charge = unitsInSlab * slab.rate;
    rows.push({
      Slab: slab.label,
      Units: unitsInSlab,
      Rate: `₹${slab.rate.toFixed(2)}/unit`,
      Charge: formatCurrency(charge),
    });
    total += charge;
    remaining -= unitsInSlab;
  }

  if (remaining > 0 && slabs.length) {
    const last = slabs[slabs.length - 1];
    const charge = remaining * last.rate;
    rows.push({
      Slab: `${last.label} +`,
      Units: remaining,
      Rate: `₹${last.rate.toFixed(2)}/unit`,
      Charge: formatCurrency(charge),
    });
    total += charge;
    remaining = 0;
  }

  return { rows, total };
}

function calcEBBillTamilNadu(inputs) {
  const units = Math.max(0, Number(inputs.units_consumed || 0));
  const freeUnits = Math.max(0, Number(inputs.free_units || 0));
  const subsidyPct = Math.max(0, Number(inputs.subsidy_percent || 0));
  const fixedCharges = Number(inputs.fixed_charges || 70);
  const chargeableUnits = Math.max(0, units - freeUnits);

  const slabs = [
    { label: '0-100', limit: 100, rate: 0.50 },
    { label: '101-200', limit: 100, rate: 1.00 },
    { label: '201-300', limit: 100, rate: 3.00 },
    { label: '301-400', limit: 100, rate: 4.50 },
    { label: '401-500', limit: 100, rate: 6.00 },
    { label: '501+', limit: Infinity, rate: 7.50 },
  ];

  const { rows, total } = calculateSlabCharges(chargeableUnits, slabs);
  const subsidyAmount = Math.max(0, (total * subsidyPct) / 100);
  const estimate = Math.max(0, total + fixedCharges - subsidyAmount);

  return {
    type: 'cards',
    cards: [
      { label: 'Units Consumed', value: `${units} U`, raw: units, highlight: true },
      { label: 'Chargeable Units', value: `${chargeableUnits} U`, raw: chargeableUnits },
      { label: 'Energy Charge', value: formatCurrency(total), raw: total },
      { label: 'Fixed Charges', value: formatCurrency(fixedCharges), raw: fixedCharges },
      { label: 'Subsidy', value: `- ${formatCurrency(subsidyAmount)}`, raw: subsidyAmount },
      { label: 'Estimated TN EB Bill', value: formatCurrency(estimate), raw: estimate },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Energy', value: Math.round(total) },
        { name: 'Fixed', value: Math.round(fixedCharges) },
        { name: 'Subsidy', value: Math.round(subsidyAmount) },
      ],
      dataKeys: ['value'],
    },
    table: rows,
  };
}

function calcTNEBBill(inputs) {
  const units = Math.max(0, Number(inputs.units_consumed || 0));
  const customerType = String(inputs.customer_type || 'Domestic');
  const subsidyPct = Math.max(0, Number(inputs.subsidy_percent || 0));
  const fixedCharges = Number(inputs.fixed_charges || 70);

  const domesticSlabs = [
    { label: '0-100', limit: 100, rate: 1.50 },
    { label: '101-200', limit: 100, rate: 2.75 },
    { label: '201-300', limit: 100, rate: 4.50 },
    { label: '301-400', limit: 100, rate: 6.00 },
    { label: '401-500', limit: 100, rate: 7.50 },
    { label: '501+', limit: Infinity, rate: 8.50 },
  ];
  const commercialSlabs = [
    { label: '0-100', limit: 100, rate: 8.00 },
    { label: '101-200', limit: 100, rate: 9.25 },
    { label: '201+', limit: Infinity, rate: 10.50 },
  ];

  const slabs = customerType === 'Commercial' ? commercialSlabs : domesticSlabs;
  const { rows, total } = calculateSlabCharges(units, slabs);
  const subsidyAmount = Math.max(0, (total * subsidyPct) / 100);
  const estimate = Math.max(0, total + fixedCharges - subsidyAmount);

  return {
    type: 'cards',
    cards: [
      { label: 'Customer Type', value: customerType, raw: customerType, highlight: true },
      { label: 'Units Consumed', value: `${units} U`, raw: units },
      { label: 'Energy Charge', value: formatCurrency(total), raw: total },
      { label: 'Fixed Charges', value: formatCurrency(fixedCharges), raw: fixedCharges },
      { label: 'Subsidy', value: `- ${formatCurrency(subsidyAmount)}`, raw: subsidyAmount },
      { label: 'Estimated TNEB Bill', value: formatCurrency(estimate), raw: estimate },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Energy', value: Math.round(total) },
        { name: 'Fixed', value: Math.round(fixedCharges) },
        { name: 'Subsidy', value: Math.round(subsidyAmount) },
      ],
      dataKeys: ['value'],
    },
    table: rows,
  };
}

function calcIncomeTaxIndia(income) {
  const taxable = Math.max(0, income);
  let tax = 0;
  if (taxable > 1000000) {
    tax += (taxable - 1000000) * 0.30;
    tax += 500000 * 0.20;
    tax += 250000 * 0.05;
  } else if (taxable > 500000) {
    tax += (taxable - 500000) * 0.20;
    tax += 250000 * 0.05;
  } else if (taxable > 250000) {
    tax += (taxable - 250000) * 0.05;
  }
  const cess = tax * 0.04;
  return tax + cess;
}

function calcSalaryHikeIndia(inputs) {
  const currentSalary = Number(inputs.current_salary || 0);
  const hikePercent = Number(inputs.hike_percent || 0);
  const basicShare = Number(inputs.basic_percent || 45) / 100;
  const professionalTax = Number(inputs.professional_tax || 2400);

  if (currentSalary <= 0) return { error: 'Enter a valid current annual salary to calculate the hike.' };

  const newSalary = currentSalary * (1 + hikePercent / 100);
  const currentTax = calcIncomeTaxIndia(Math.max(0, currentSalary - 50000));
  const newTax = calcIncomeTaxIndia(Math.max(0, newSalary - 50000));
  const currentInHandAnnual = Math.max(0, currentSalary - currentTax - professionalTax);
  const newInHandAnnual = Math.max(0, newSalary - newTax - professionalTax);
  const currentMonthly = currentInHandAnnual / 12;
  const newMonthly = newInHandAnnual / 12;

  return {
    type: 'cards',
    cards: [
      { label: 'Current CTC', value: formatCurrency(currentSalary), raw: currentSalary },
      { label: 'New CTC', value: formatCurrency(newSalary), raw: newSalary, highlight: true },
      { label: 'Tax Change', value: formatCurrency(newTax - currentTax), raw: newTax - currentTax },
      { label: 'Annual In-Hand Change', value: formatCurrency(newInHandAnnual - currentInHandAnnual), raw: newInHandAnnual - currentInHandAnnual },
      { label: 'Monthly Take-Home (New)', value: formatCurrency(newMonthly), raw: newMonthly },
      { label: 'Basic Share', value: `${Math.round(basicShare * 100)}%`, raw: basicShare },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Current In-Hand', value: Math.round(currentMonthly) },
        { name: 'New In-Hand', value: Math.round(newMonthly) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcPFCalculatorIndia(inputs) {
  const monthlyBasic = Number(inputs.monthly_basic || 0);
  const employeeRate = Number(inputs.employee_pf_rate || 12) / 100;
  const employerRate = Number(inputs.employer_pf_rate || 12) / 100;
  const years = Math.max(0, Number(inputs.years || 0));
  const annualInterest = Number(inputs.annual_interest || 8.15) / 100;

  if (monthlyBasic <= 0 || years <= 0) return { error: 'Enter valid basic salary and contribution years.' };

  const monthlyEmployee = monthlyBasic * employeeRate;
  const monthlyEmployer = monthlyBasic * employerRate;
  const monthlyTotal = monthlyEmployee + monthlyEmployer;
  const annualContribution = monthlyTotal * 12;
  const monthlyRate = annualInterest / 12;
  let balance = 0;
  const rows = [];

  for (let year = 1; year <= years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      balance = balance * (1 + monthlyRate) + monthlyTotal;
    }
    const contributionsToDate = annualContribution * year;
    const interestToDate = balance - contributionsToDate;
    rows.push({
      Year: year,
      Contributions: formatCurrency(contributionsToDate),
      Interest: formatCurrency(interestToDate),
      Balance: formatCurrency(balance),
    });
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Employee PF (Monthly)', value: formatCurrency(monthlyEmployee), raw: monthlyEmployee },
      { label: 'Employer PF (Monthly)', value: formatCurrency(monthlyEmployer), raw: monthlyEmployer },
      { label: 'Annual PF Contribution', value: formatCurrency(annualContribution), raw: annualContribution },
      { label: `${years} Year Corpus`, value: formatCurrency(balance), raw: balance, highlight: true },
      { label: 'Estimated Interest', value: formatCurrency(balance - annualContribution * years), raw: balance - annualContribution * years },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Contributions', value: Math.round(annualContribution) },
        { name: 'Interest', value: Math.round(balance - annualContribution * years) },
      ],
      dataKeys: ['value'],
    },
    table: rows,
  };
}

function calcGratuityIndia(inputs) {
  const salary = Number(inputs.last_drawn_salary || 0);
  const years = Number(inputs.years_of_service || 0);

  if (salary <= 0 || years <= 0) return { error: 'Enter valid last drawn salary and years of service.' };

  const gratuity = salary * 15 / 26 * years;
  const eligible = years >= 5;
  const note = eligible
    ? 'You are eligible for gratuity under Indian payment rules.'
    : 'Gratuity is usually payable after 5 years of service.';

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Gratuity', value: formatCurrency(gratuity), raw: gratuity, highlight: true },
      { label: 'Years of Service', value: `${years} years`, raw: years },
      { label: 'Eligibility', value: eligible ? 'Yes' : 'Not Yet', raw: eligible },
      { label: 'Tax-Free Amount', value: eligible ? formatCurrency(gratuity) : 'N/A', raw: eligible ? gratuity : 0 },
      { label: 'Gratuity Formula', value: 'Last salary x 15/26 x years', raw: 'formula' },
    ],
    extra: { message: note },
  };
}

function calcInHandSalaryIndia(inputs) {
  const annualCtc = Number(inputs.annual_ctc || 0);
  const basicShare = Number(inputs.basic_percent || 45) / 100;
  const hraShare = Number(inputs.hra_percent || 40) / 100;
  const otherAllowances = Number(inputs.other_allowances || 0);
  const profTaxMonthly = Number(inputs.professional_tax_monthly || 200);
  const pfRate = Number(inputs.pf_rate || 12) / 100;

  if (annualCtc <= 0) return { error: 'Enter a valid annual CTC to calculate in-hand salary.' };

  const basic = annualCtc * basicShare;
  const hra = annualCtc * hraShare;
  const other = Math.min(otherAllowances, Math.max(0, annualCtc - basic - hra));
  const gross = basic + hra + other;
  const annualPF = basic * pfRate * 12;
  const annualProfTax = profTaxMonthly * 12;
  const taxable = Math.max(0, gross - 50000 - annualPF);
  const incomeTax = calcIncomeTaxIndia(taxable);
  const annualInHand = Math.max(0, gross - annualPF - incomeTax - annualProfTax);
  const monthlyInHand = annualInHand / 12;

  return {
    type: 'cards',
    cards: [
      { label: 'Annual CTC', value: formatCurrency(annualCtc), raw: annualCtc },
      { label: 'Gross Salary', value: formatCurrency(gross), raw: gross },
      { label: 'Annual PF Deduction', value: formatCurrency(annualPF), raw: annualPF },
      { label: 'Annual Income Tax', value: formatCurrency(incomeTax), raw: incomeTax },
      { label: 'Annual Professional Tax', value: formatCurrency(annualProfTax), raw: annualProfTax },
      { label: 'Monthly In-Hand Salary', value: formatCurrency(monthlyInHand), raw: monthlyInHand, highlight: true },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Gross', value: Math.round(gross / 12) },
        { name: 'In-Hand', value: Math.round(monthlyInHand) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcFuelExpenseIndia(inputs) {
  const distance = Number(inputs.distance_km || 0);
  const mileage = Number(inputs.mileage || 0);
  const price = Number(inputs.fuel_price || 0);
  const trips = Number(inputs.trips_per_month || 0);
  const litresPerTrip = mileage > 0 ? distance / mileage : 0;
  const costPerTrip = litresPerTrip * price;
  const monthlyCost = costPerTrip * trips;
  const yearlyCost = monthlyCost * 12;

  return {
    type: 'cards',
    cards: [
      { label: 'Fuel Type', value: String(inputs.fuel_type || 'Petrol'), raw: inputs.fuel_type },
      { label: 'Cost per Trip', value: formatCurrency(costPerTrip), raw: costPerTrip },
      { label: 'Monthly Fuel Cost', value: formatCurrency(monthlyCost), raw: monthlyCost, highlight: true },
      { label: 'Yearly Fuel Cost', value: formatCurrency(yearlyCost), raw: yearlyCost },
      { label: 'Fuel Required per Trip', value: `${litresPerTrip.toFixed(2)} L`, raw: litresPerTrip },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Monthly', value: Math.round(monthlyCost) },
        { name: 'Yearly', value: Math.round(yearlyCost) },
      ],
      dataKeys: ['value'],
    },
  };
}

function calcLoanEligibilityIndia(inputs) {
  const annualIncome = Number(inputs.annual_income || 0);
  const existingEmi = Number(inputs.existing_emi || 0);
  const tenureYears = Math.max(1, Number(inputs.tenure_years || 20));
  const annualRate = Number(inputs.interest_rate || 8.5) / 100;

  if (annualIncome <= 0) return { error: 'Enter a valid annual income to calculate loan eligibility.' };

  const monthlyIncome = annualIncome / 12;
  const maxAvailableEmi = Math.max(0, monthlyIncome * 0.50 - existingEmi);
  const monthlyRate = annualRate / 12;
  const totalMonths = tenureYears * 12;
  const loanAmount = monthlyRate > 0
    ? maxAvailableEmi * (1 - Math.pow(1 + monthlyRate, -totalMonths)) / monthlyRate
    : maxAvailableEmi * totalMonths;
  const debtRatio = annualIncome > 0 ? (existingEmi * 12) / annualIncome : 0;
  const eligibilityScore = Math.max(0, Math.min(100, 90 - debtRatio * 100));

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Loan Amount', value: formatCurrency(loanAmount), raw: loanAmount, highlight: true },
      { label: 'Affordable EMI', value: formatCurrency(maxAvailableEmi), raw: maxAvailableEmi },
      { label: 'Debt-to-Income Ratio', value: `${(debtRatio * 100).toFixed(1)}%`, raw: debtRatio },
      { label: 'Eligibility Score', value: `${Math.round(eligibilityScore)}%`, raw: eligibilityScore },
      { label: 'Tenure', value: `${tenureYears} years`, raw: tenureYears },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'EMI Capacity', value: Math.round(maxAvailableEmi) },
        { name: 'Loan Estimate', value: Math.round(loanAmount / 1000) * 1000 },
      ],
      dataKeys: ['value'],
    },
  };
}

async function calcYouTubeMoney(inputs) {
  const views = Math.max(0, Number(inputs.monthly_views || 0));
  const country = String(inputs.country || 'United States');
  const niche = String(inputs.niche || 'Tech');
  const uploads = Math.max(1, Number(inputs.monthly_uploads || 1));
  const shortsViews = Math.max(0, Number(inputs.shorts_views || 0));
  const overrideRpm = Number(inputs.average_rpm || 0);

  const countryCpmMap = {
    'United States': 220,
    'United Kingdom': 180,
    India: 95,
    Canada: 160,
    Australia: 175,
    Global: 140,
  };

  const nicheBoost = {
    Tech: 1.25,
    Finance: 1.35,
    Gaming: 0.95,
    Lifestyle: 1.0,
    Beauty: 0.92,
    Education: 1.1,
    Health: 1.05,
    Food: 0.88,
  };

  const baseCpm = countryCpmMap[country] || countryCpmMap.Global;
  const adjustedCpm = Math.max(10, baseCpm * (nicheBoost[niche] || 1));
  const effectiveRpm = overrideRpm > 0 ? overrideRpm : Math.max(12, adjustedCpm * 0.45);
  const monthlyEarnings = (views / 1000) * effectiveRpm;
  const shortsEarnings = (shortsViews / 1000) * Math.max(5, adjustedCpm * 0.18);
  const yearlyEarnings = monthlyEarnings * 12;
  const projectedSubscribers = Math.round(views / 65 * Math.min(1.6, 0.9 + (adjustedCpm / 300)));
  const monetizationScore = Math.min(100, Math.round((views / 100000) * 14 + (uploads / 12) * 10 + (effectiveRpm / 50) * 15));

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Monthly Revenue', value: formatCurrency(monthlyEarnings), raw: monthlyEarnings, highlight: true, description: 'Creator earnings estimate based on RPM and engagement.' },
      { label: 'Estimated Yearly Revenue', value: formatCurrency(yearlyEarnings), raw: yearlyEarnings },
      { label: 'Estimated RPM', value: `₹${effectiveRpm.toFixed(2)}`, raw: effectiveRpm },
      { label: 'Estimated CPM', value: `₹${adjustedCpm.toFixed(2)}`, raw: adjustedCpm },
      { label: 'Shorts Revenue Estimate', value: formatCurrency(shortsEarnings), raw: shortsEarnings },
      { label: 'Subscriber Growth Estimate', value: `${projectedSubscribers.toLocaleString()} new subs`, raw: projectedSubscribers },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Monthly', value: Math.round(monthlyEarnings) },
        { name: 'Shorts', value: Math.round(shortsEarnings) },
        { name: 'Yearly / 12', value: Math.round(yearlyEarnings / 12) },
      ],
      dataKeys: ['value'],
    },
    extra: {
      message: `Monetization score: ${monetizationScore}% — keep posting ${uploads} videos per month and optimize thumbnails for higher RPM.`,
    },
  };
}

function calcYouTubeWatchTime(inputs) {
  const videos = Math.max(0, Number(inputs.videos_per_month || 0));
  const averageLength = Math.max(0, Number(inputs.avg_video_length || 0));
  const viewsPerVideo = Math.max(0, Number(inputs.avg_views_per_video || 0));
  const watchPercent = Math.min(100, Math.max(0, Number(inputs.avg_view_percentage || 0)));
  const goalHours = Math.max(0, Number(inputs.monthly_goal_hours || 400));

  const avgWatchMinutes = averageLength * (watchPercent / 100);
  const totalWatchMinutes = videos * viewsPerVideo * avgWatchMinutes;
  const monthlyWatchHours = totalWatchMinutes / 60;
  const dailyWatchHours = monthlyWatchHours / 30;
  const progressPercent = goalHours > 0 ? Math.min(100, (monthlyWatchHours / goalHours) * 100) : 0;
  const onTrack = progressPercent >= 100;

  return {
    type: 'cards',
    cards: [
      { label: 'Monthly Watch Hours', value: `${monthlyWatchHours.toFixed(1)} hrs`, raw: monthlyWatchHours, highlight: true },
      { label: 'Daily Watch Hours', value: `${dailyWatchHours.toFixed(1)} hrs`, raw: dailyWatchHours },
      { label: 'Goal Progress', value: `${progressPercent.toFixed(1)}%`, raw: progressPercent },
      { label: 'Average Video Retention', value: `${watchPercent.toFixed(1)}%`, raw: watchPercent },
      { label: '4000-Hour Trend', value: onTrack ? 'On track' : 'Needs boost', raw: onTrack },
    ],
    chart: {
      type: 'gauge',
      value: progressPercent,
      min: 0,
      max: 100,
      zones: [
        { from: 0, to: 50, color: '#f97316', label: 'Improve' },
        { from: 50, to: 85, color: '#facc15', label: 'Growing' },
        { from: 85, to: 100, color: '#22c55e', label: 'Monetize' },
      ],
    },
    table: [
      { Day: 'Estimated Average', 'Watch Hours': `${dailyWatchHours.toFixed(1)} hrs`, 'Goal Status': onTrack ? 'Ahead' : 'Behind' },
    ],
    extra: { message: onTrack ? 'Watch time is strong — maintain your upload cadence.' : 'Push longer videos and stronger hooks to improve watch hours.' },
  };
}

async function calcYouTubeThumbnailCheck(inputs) {
  const file = inputs.thumbnail_file;
  const url = String(inputs.image_url || '').trim();
  const sourceFile = file instanceof File ? file : null;
  const sourceUrl = !sourceFile && url ? url : null;

  if (!sourceFile && !sourceUrl) return { error: 'Upload a thumbnail file or enter a thumbnail URL.' };

  let width = 0;
  let height = 0;
  let previewImage = '';
  let fileSize = sourceFile?.size || 0;

  try {
    if (sourceFile) {
      previewImage = URL.createObjectURL(sourceFile);
      const metadata = await loadImageFromFile(sourceFile);
      width = metadata.width;
      height = metadata.height;
    } else {
      previewImage = sourceUrl;
      const metadata = await loadImageFromUrl(sourceUrl);
      width = metadata.width;
      height = metadata.height;
    }
  } catch (error) {
    return { error: 'Could not load the thumbnail. Please provide a valid image file or URL.' };
  }

  const aspectRatio = width && height ? (width / height).toFixed(2) : '0.00';
  const isExactSize = width === 1280 && height === 720;
  const isIdealAspect = Math.abs((width / height) - (16 / 9)) < 0.03;
  const fileSizeMb = sourceFile ? fileSize / 1024 / 1024 : null;
  const sizeOk = sourceFile ? fileSizeMb <= 2 : null;

  const cards = [
    { label: 'Dimensions', value: `${width} × ${height}`, raw: `${width}x${height}`, highlight: true },
    { label: 'Aspect Ratio', value: `${aspectRatio}:1`, raw: aspectRatio },
    { label: 'Target Size', value: '1280 × 720', raw: '1280x720' },
    { label: 'Orientation', value: isIdealAspect ? '16:9 ✓' : 'Adjust to 16:9', raw: isIdealAspect },
  ];

  if (sourceFile) {
    cards.push({ label: 'File Size', value: `${fileSizeMb.toFixed(2)} MB`, raw: fileSizeMb });
  }

  cards.push({ label: 'Validation', value: isExactSize && (sizeOk || sourceUrl) ? 'Ready for upload' : 'Needs optimization', raw: isExactSize });

  return {
    type: 'cards',
    cards,
    chart: {
      type: 'bar',
      data: [
        { name: 'Width', value: width },
        { name: 'Height', value: height },
      ],
      dataKeys: ['value'],
    },
    extra: {
      previewImage,
      message: isExactSize && isIdealAspect ? 'Perfect thumbnail dimensions. Use bold text and contrast for better clicks.' : 'Your thumbnail needs a 16:9 ratio and 1280×720 in resolution for optimal YouTube performance.',
    },
  };
}

async function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(url, true);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageFromUrl(url, skipCrossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!skipCrossOrigin) img.crossOrigin = 'Anonymous';
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

function calcInstagramEngagement(inputs) {
  const followers = Math.max(0, Number(inputs.followers || 0));
  const likes = Math.max(0, Number(inputs.likes || 0));
  const comments = Math.max(0, Number(inputs.comments || 0));
  const shares = Math.max(0, Number(inputs.shares || 0));
  const saves = Math.max(0, Number(inputs.saves || 0));
  const postsPerWeek = Math.max(0, Number(inputs.posts_per_week || 0));

  const totalInteractions = likes + comments + shares + saves;
  const engagementRate = followers > 0 ? (totalInteractions / followers) * 100 : 0;
  const creatorScore = Math.min(100, Math.round(engagementRate * 1.6 + postsPerWeek * 2.5));
  const projectedGrowth = Math.round((followers * (engagementRate / 100) * 0.07) + postsPerWeek * 12);

  return {
    type: 'cards',
    cards: [
      { label: 'Engagement Rate', value: `${engagementRate.toFixed(2)}%`, raw: engagementRate, highlight: true },
      { label: 'Follower Growth Estimate', value: `${projectedGrowth.toLocaleString()} / month`, raw: projectedGrowth },
      { label: 'Creator Score', value: `${creatorScore}%`, raw: creatorScore },
      { label: 'Posts Per Week', value: `${postsPerWeek}`, raw: postsPerWeek },
      { label: 'Interaction Total', value: totalInteractions.toLocaleString(), raw: totalInteractions },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Likes', value: likes },
        { name: 'Comments', value: comments },
        { name: 'Shares', value: shares },
        { name: 'Saves', value: saves },
      ],
      dataKeys: ['value'],
    },
    extra: { message: 'Higher engagement leads to better reach. Aim for consistent posting and meaningful captions.' },
  };
}

function calcTikTokMoney(inputs) {
  const views = Math.max(0, Number(inputs.monthly_views || 0));
  const watchTime = Math.max(0, Number(inputs.average_watch_time || 0));
  const followers = Math.max(0, Number(inputs.followers || 0));
  const engagementRate = Math.max(0, Number(inputs.engagement_rate || 0));
  const sponsorRate = Math.max(0, Number(inputs.sponsor_rate || 0));

  const fundCpm = Math.max(18, 20 + engagementRate * 1.6 + Math.min(15, watchTime / 4));
  const fundRevenue = (views / 1000) * fundCpm * 0.2;
  const sponsorRevenue = (views / 1000) * Math.max(sponsorRate, 40);
  const monthlyEarnings = fundRevenue + sponsorRevenue;
  const yearlyEarnings = monthlyEarnings * 12;
  const followerMilestone = Math.round(followers + Math.max(0, views / 1000 * (engagementRate / 9)));

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Monthly Earnings', value: formatCurrency(monthlyEarnings), raw: monthlyEarnings, highlight: true },
      { label: 'Creator Fund Revenue', value: formatCurrency(fundRevenue), raw: fundRevenue },
      { label: 'Sponsorship Estimate', value: formatCurrency(sponsorRevenue), raw: sponsorRevenue },
      { label: 'Projected Yearly Earnings', value: formatCurrency(yearlyEarnings), raw: yearlyEarnings },
      { label: 'Follower Milestone', value: `${followerMilestone.toLocaleString()} followers`, raw: followerMilestone },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Fund', value: Math.round(fundRevenue) },
        { name: 'Sponsor', value: Math.round(sponsorRevenue) },
      ],
      dataKeys: ['value'],
    },
    extra: { message: 'Strong watch time and engagement help you qualify for creator fund payouts and premium sponsorships.' },
  };
}

function calcSocialMediaROI(inputs) {
  const adSpend = Math.max(0, Number(inputs.ad_spend || 0));
  const conversions = Math.max(0, Number(inputs.conversions || 0));
  const avgOrderValue = Math.max(0, Number(inputs.avg_order_value || 0));
  const engagementRate = Math.max(0, Number(inputs.engagement_rate || 0));
  const otherRevenue = Math.max(0, Number(inputs.other_revenue || 0));

  const revenue = conversions * avgOrderValue + otherRevenue;
  const profit = revenue - adSpend;
  const roi = adSpend > 0 ? (profit / adSpend) * 100 : 0;
  const costPerConversion = conversions > 0 ? adSpend / conversions : 0;
  const engagementValue = engagementRate > 0 ? revenue / engagementRate : revenue;
  const campaignGrade = roi >= 50 ? 'High ROI' : roi >= 20 ? 'Healthy ROI' : 'Needs Optimization';

  return {
    type: 'cards',
    cards: [
      { label: 'Campaign ROI', value: `${roi.toFixed(1)}%`, raw: roi, highlight: true },
      { label: 'Profit / Loss', value: formatCurrency(profit), raw: profit },
      { label: 'Revenue Generated', value: formatCurrency(revenue), raw: revenue },
      { label: 'Cost per Conversion', value: formatCurrency(costPerConversion), raw: costPerConversion },
      { label: 'Engagement ROI', value: formatCurrency(engagementValue), raw: engagementValue },
      { label: 'Campaign Grade', value: campaignGrade, raw: campaignGrade },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Revenue', value: Math.round(revenue) },
        { name: 'Spend', value: Math.round(adSpend) },
        { name: 'Profit', value: Math.round(profit) },
      ],
      dataKeys: ['value'],
    },
    table: [
      { Metric: 'Engagement Rate', Value: `${engagementRate.toFixed(1)}%` },
      { Metric: 'Conversions', Value: conversions.toString() },
      { Metric: 'Avg Order Value', Value: formatCurrency(avgOrderValue) },
    ],
    extra: { message: campaignGrade === 'High ROI' ? 'Your campaign is performing well. Maintain audience relevance to scale further.' : 'Improve targeting, creative and conversion flow to raise your ROI.' },
  };
}

function calcContentUploadScheduler(inputs) {
  const platform = String(inputs.platform || 'YouTube');
  const timezone = String(inputs.timezone || 'UTC');
  const postsPerWeek = Math.max(1, Number(inputs.posts_per_week || 5));
  const focusGoal = String(inputs.focus_goal || 'Growth');

  const platformSlots = {
    YouTube: ['Tuesday 6 PM', 'Thursday 6 PM', 'Saturday 10 AM', 'Sunday 10 AM'],
    Instagram: ['Monday 8 PM', 'Wednesday 7 PM', 'Friday 6 PM', 'Sunday 5 PM'],
    TikTok: ['Tuesday 7 PM', 'Thursday 8 PM', 'Saturday 1 PM', 'Sunday 2 PM'],
    Twitter: ['Monday 9 AM', 'Wednesday 9 AM', 'Friday 9 AM', 'Saturday 11 AM'],
    LinkedIn: ['Tuesday 9 AM', 'Wednesday 11 AM', 'Thursday 9 AM', 'Friday 10 AM'],
  };

  const slots = platformSlots[platform] || platformSlots.YouTube;
  const schedule = slots.slice(0, Math.min(postsPerWeek, slots.length)).map((slot, index) => ({
    Day: `Day ${index + 1}`,
    Time: slot,
    Focus: focusGoal,
  }));

  const cadence = postsPerWeek <= 2 ? 'Light' : postsPerWeek <= 4 ? 'Balanced' : 'Aggressive';
  const reachPotential = Math.min(100, 40 + postsPerWeek * 10 + (focusGoal === 'Engagement' ? 10 : focusGoal === 'Monetization' ? 5 : 0));

  return {
    type: 'cards',
    cards: [
      { label: 'Platform', value: platform, raw: platform },
      { label: 'Timezone', value: timezone, raw: timezone },
      { label: 'Weekly Posts', value: `${postsPerWeek}`, raw: postsPerWeek, highlight: true },
      { label: 'Recommended Cadence', value: cadence, raw: cadence },
      { label: 'Reach Potential', value: `${reachPotential}%`, raw: reachPotential },
      { label: 'Primary Goal', value: focusGoal, raw: focusGoal },
    ],
    table: schedule,
    chart: {
      type: 'area',
      data: schedule.map((row, index) => ({ name: row.Day, value: 20 + index * 15 })),
      dataKeys: ['value'],
      labels: ['Publishing Momentum'],
    },
    extra: { message: `Use these best times to keep your ${platform} uploads consistent and aligned with ${focusGoal.toLowerCase()} goals.` },
  };
}

function calcHashtagDensity(inputs) {
  const text = String(inputs.post_text || '').trim();
  const targetCount = Math.max(0, Number(inputs.recommended_hashtag_count || 10));
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const hashtags = text.match(/#\w[\w-]*/g) || [];
  const uniqueTags = [...new Set(hashtags.map(tag => tag.toLowerCase()))];
  const duplicateCount = hashtags.length - uniqueTags.length;
  const density = words.length ? (hashtags.length / words.length) * 100 : 0;
  const spamRisk = density > 8 || hashtags.length > targetCount ? 'High' : 'Healthy';

  return {
    type: 'cards',
    cards: [
      { label: 'Hashtag Count', value: `${hashtags.length}`, raw: hashtags.length, highlight: true },
      { label: 'Unique Hashtags', value: `${uniqueTags.length}`, raw: uniqueTags.length },
      { label: 'Hashtag Density', value: `${density.toFixed(1)}%`, raw: density },
      { label: 'Duplicates', value: `${duplicateCount}`, raw: duplicateCount },
      { label: 'Spam Risk', value: spamRisk, raw: spamRisk },
      { label: 'Target Count', value: `${targetCount}`, raw: targetCount },
    ],
    chart: {
      type: 'bar',
      data: [
        { name: 'Hashtags', value: hashtags.length },
        { name: 'Unique', value: uniqueTags.length },
        { name: 'Duplicates', value: duplicateCount },
      ],
      dataKeys: ['value'],
    },
    table: uniqueTags.slice(0, 12).map((tag, index) => ({ Hashtag: tag, Rank: index + 1 })),
    extra: { message: spamRisk === 'High' ? 'Too many hashtags may reduce reach. Trim duplicates and focus on the strongest tags.' : 'Hashtag density looks healthy. Keep your caption clear and aligned with your content.', },
  };
}

function calcTemperature(inputs) {
  const val = Number(inputs.value || 0);
  const from = inputs.from_unit || 'C';
  let celsius;
  if (from === 'C') celsius = val;
  else if (from === 'F') celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  const fahrenheit = celsius * 9 / 5 + 32;
  const kelvin = celsius + 273.15;
  return {
    type: 'cards',
    cards: [
      { label: 'Celsius', value: `${celsius.toFixed(2)} °C`, raw: celsius },
      { label: 'Fahrenheit', value: `${fahrenheit.toFixed(2)} °F`, raw: fahrenheit },
      { label: 'Kelvin', value: `${kelvin.toFixed(2)} K`, raw: kelvin },
    ],
  };
}

function calcUnitConverter(inputs) {
  const val = Number(inputs.value || 0);
  const from = inputs.from_unit || '';
  const to = inputs.to_unit || '';
  const category = inputs.category || 'length';

  // Table values = units per base unit (meters, kg, liters, etc.)
  // To convert: base = val / fromRate, result = base * toRate
  const tables = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, inch: 0.0254, yd: 0.9144 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
    area:   { m2: 1, km2: 1e6, cm2: 0.0001, ft2: 0.092903, acre: 4046.86, hectare: 10000 },
    volume: { l: 1, ml: 0.001, m3: 1000, gallon: 3.78541, cup: 0.236588, pint: 0.473176 },
    speed:  { 'km/h': 1, 'm/s': 3.6, mph: 1.60934, knot: 1.852 },
  };

  const table = tables[category];
  if (!table || !table[from] || !table[to]) return { error: 'Invalid units' };

  // val in `from` units → convert to base → convert to `to` units
  const result = (val * table[from]) / table[to];
  return {
    type: 'cards',
    cards: [
      { label: `${val} ${from} in ${to}`, value: formatNumber(result), raw: result, highlight: true },
    ],
  };
}

function calcRoman(inputs) {
  const input = inputs.value || inputs.number || '';
  if (/^\d+$/.test(input)) {
    const num = parseInt(input);
    if (num < 1 || num > 3999) return { error: 'Enter 1–3999' };
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let n = num, roman = '';
    vals.forEach((v, i) => { while (n >= v) { roman += syms[i]; n -= v; } });
    return { type: 'text', value: roman, label: `${num} in Roman Numerals` };
  } else {
    const str = input.toUpperCase();
    const map = { M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1 };
    let result = 0, i = 0;
    while (i < str.length) {
      const two = str.slice(i, i+2);
      if (map[two]) { result += map[two]; i += 2; }
      else if (map[str[i]]) { result += map[str[i]]; i++; }
      else return { error: 'Invalid Roman numeral' };
    }
    return { type: 'text', value: String(result), label: `${input} in Arabic Numerals` };
  }
}

function calcBinary(inputs) {
  const val = inputs.value || '';
  const from = inputs.from_base || 'decimal';
  let decimal;
  if (from === 'decimal') decimal = parseInt(val, 10);
  else if (from === 'binary') decimal = parseInt(val, 2);
  else if (from === 'hex') decimal = parseInt(val, 16);
  else if (from === 'octal') decimal = parseInt(val, 8);
  if (isNaN(decimal)) return { error: 'Invalid input' };
  return {
    type: 'cards',
    cards: [
      { label: 'Decimal', value: decimal.toString(10) },
      { label: 'Binary', value: decimal.toString(2) },
      { label: 'Hexadecimal', value: decimal.toString(16).toUpperCase() },
      { label: 'Octal', value: decimal.toString(8) },
    ],
  };
}

function calcHex(inputs) {
  const color = inputs.color || '#000000';
  const hex = color.startsWith('#') ? color : `#${color}`;
  const rgb = hexToRgb(hex);
  if (!rgb) return { error: 'Invalid hex color' };
  return {
    type: 'cards',
    cards: [
      { label: 'HEX', value: hex.toUpperCase() },
      { label: 'RGB', value: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
      { label: 'HSL', value: rgbToHsl(rgb.r, rgb.g, rgb.b) },
    ],
    extra: { color: hex },
  };
}

function caseConverter(inputs) {
  const text = inputs.text || '';
  return {
    type: 'cards',
    cards: [
      { label: 'UPPERCASE', value: text.toUpperCase() },
      { label: 'lowercase', value: text.toLowerCase() },
      { label: 'Title Case', value: text.replace(/\b\w/g, c => c.toUpperCase()) },
      { label: 'Sentence case', value: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() },
      { label: 'camelCase', value: text.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase()) },
      { label: 'snake_case', value: text.replace(/[\s-]+/g, '_').toLowerCase() },
    ],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n) {
  if (typeof n !== 'number' || isNaN(n)) return String(n);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Number.isInteger(n)) return n.toLocaleString();
  return parseFloat(n.toFixed(6)).toLocaleString();
}

function formatCurrency(n) {
  if (!isFinite(n)) return '₹0';
  return '₹' + parseFloat(n.toFixed(2)).toLocaleString('en-IN');
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function safeParseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

let pdfLibLoadPromise = null;
let jsZipLoadPromise = null;
let pdfWorkerSetupLoadPromise = null;

function loadPdfLib() {
  if (!pdfLibLoadPromise) {
    pdfLibLoadPromise = import('pdf-lib');
  }
  return pdfLibLoadPromise;
}

function loadJSZip() {
  if (!jsZipLoadPromise) {
    jsZipLoadPromise = import('jszip');
  }
  return jsZipLoadPromise;
}

function loadPdfWorkerSetup() {
  if (!pdfWorkerSetupLoadPromise) {
    pdfWorkerSetupLoadPromise = import('./pdfWorkerSetup');
  }
  return pdfWorkerSetupLoadPromise;
}

async function getPdfJsLibInstance() {
  const module = await loadPdfWorkerSetup();
  return module.getPdfJsLib();
}

// ─── PDF Tools ────────────────────────────────────────────────────────────────
async function mergePDF(inputs) {
  try {
    const files = inputs.files || [];
    if (files.length < 2) return { error: 'At least 2 PDF files required' };

    const { PDFDocument } = await loadPdfLib();
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const pdf = await PDFDocument.load(file);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'merged.pdf',
      label: 'Merged PDF'
    };
  } catch (e) {
    return { error: `Merge failed: ${e.message}` };
  }
}

async function splitPDF(inputs) {
  try {
    const file = inputs.file;
    const pages = inputs.pages || '1'; // e.g., "1,3-5"
    if (!file) return { error: 'PDF file required' };

    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.load(file);
    const totalPages = pdf.getPageCount();

    const pageIndices = parsePageRanges(pages, totalPages);
    if (pageIndices.length === 0) return { error: 'No valid pages selected' };

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'split.pdf',
      label: 'Split PDF'
    };
  } catch (e) {
    return { error: `Split failed: ${e.message}` };
  }
}

async function compressPDF(inputs) {
  try {
    const file = inputs.file;
    if (!file) return { error: 'PDF file required' };

    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.load(file);
    const pdfBytes = await pdf.save({ useObjectStreams: false });
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'compressed.pdf',
      label: 'Compressed PDF'
    };
  } catch (e) {
    return { error: `Compression failed: ${e.message}` };
  }
}

async function pdfToJPG(inputs) {
  try {
    const file = inputs.file;
    const quality = Number(inputs.quality) || 0.9;
    if (!file) return { error: 'PDF file required' };

    const pdfjsLib = await getPdfJsLibInstance();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    if (numPages === 1) {
      // Single page - return JPG directly
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));

      return {
        type: 'file',
        value: blob,
        filename: 'page1.jpg',
        label: 'PDF Page as JPG',
        stats: {
          originalSize: file.size,
          pages: 1,
          format: 'JPG'
        }
      };
    } else {
      // Multiple pages - create ZIP
      const { default: JSZip } = await loadJSZip();
      const zip = new JSZip();
      const images = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        zip.file(`page${i}.jpg`, blob);
        images.push(blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      return {
        type: 'file',
        value: zipBlob,
        filename: 'pdf-pages.zip',
        label: 'PDF Pages as ZIP',
        stats: {
          originalSize: file.size,
          pages: numPages,
          format: 'ZIP (JPG)'
        }
      };
    }
  } catch (e) {
    return { error: `Conversion failed: ${e.message}` };
  }
}

async function jpgToPDF(inputs) {
  try {
    const files = inputs.files || [];
    if (files.length === 0) return { error: 'Image files required' };

    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.create();

    for (const file of files) {
      const image = await pdf.embedJpg(file);
      const page = pdf.addPage();
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
      });
    }

    const pdfBytes = await pdf.save();
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'images.pdf',
      label: 'Images as PDF'
    };
  } catch (e) {
    return { error: `Conversion failed: ${e.message}` };
  }
}

async function protectPDF(inputs) {
  try {
    const file = inputs.file;
    const password = inputs.password;
    if (!file || !password) return { error: 'PDF file and password required' };

    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.load(file);
    const pdfBytes = await pdf.save({ userPassword: password });
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'protected.pdf',
      label: 'Protected PDF'
    };
  } catch (e) {
    return { error: `Protection failed: ${e.message}` };
  }
}

async function removePagesPDF(inputs) {
  try {
    const file = inputs.file;
    const pages = inputs.pages || ''; // e.g., "1,3-5"
    if (!file) return { error: 'PDF file required' };

    const { PDFDocument } = await loadPdfLib();
    const pdf = await PDFDocument.load(file);
    const totalPages = pdf.getPageCount();

    const pageIndices = parsePageRanges(pages, totalPages);
    if (pageIndices.length === 0) return { error: 'No valid pages to remove' };

    const newPdf = await PDFDocument.create();
    const allIndices = Array.from({ length: totalPages }, (_, i) => i);
    const keepIndices = allIndices.filter(i => !pageIndices.includes(i));

    const copiedPages = await newPdf.copyPages(pdf, keepIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    return {
      type: 'file',
      value: new Blob([pdfBytes], { type: 'application/pdf' }),
      filename: 'pages-removed.pdf',
      label: 'Pages Removed PDF'
    };
  } catch (e) {
    return { error: `Remove pages failed: ${e.message}` };
  }
}

function parsePageRanges(ranges, totalPages) {
  const indices = new Set();
  const parts = ranges.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s) - 1);
      for (let i = start; i <= end && i < totalPages; i++) {
        indices.add(i);
      }
    } else {
      const page = parseInt(part) - 1;
      if (page >= 0 && page < totalPages) indices.add(page);
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

// ─── Math Tools Implementations ───────────────────────────────────────────────

function calcScientific(inputs) {
  const expression = inputs.expression || '';
  try {
    // Convert degrees to radians for trig functions
    const scopedExpression = expression
      .replace(/sin\(/g, 'sin((')
      .replace(/cos\(/g, 'cos((')
      .replace(/tan\(/g, 'tan((')
      .replace(/asin\(/g, 'asin((')
      .replace(/acos\(/g, 'acos((')
      .replace(/atan\(/g, 'atan((')
      .replace(/(\))([\s]*sin)/g, '$1 * PI / 180) * sin')
      .replace(/(\))([\s]*cos)/g, '$1 * PI / 180) * cos')
      .replace(/(\))([\s]*tan)/g, '$1 * PI / 180) * tan');

    const result = evaluate(expression, {
      sin: (x) => Math.sin(x * Math.PI / 180),
      cos: (x) => Math.cos(x * Math.PI / 180),
      tan: (x) => Math.tan(x * Math.PI / 180),
      asin: (x) => Math.asin(x) * 180 / Math.PI,
      acos: (x) => Math.acos(x) * 180 / Math.PI,
      atan: (x) => Math.atan(x) * 180 / Math.PI,
      sqrt: Math.sqrt,
      pow: Math.pow,
      log: Math.log10,
      ln: Math.log,
      abs: Math.abs,
      PI: Math.PI,
      E: Math.E,
    });

    return {
      type: 'cards',
      cards: [
        { label: 'Result', value: formatNumber(result), raw: result, highlight: true },
        { label: 'Expression', value: expression, raw: expression },
      ],
    };
  } catch (e) {
    return { error: `Invalid expression: ${e.message}` };
  }
}

function calcFraction(inputs) {
  const num1 = Number(inputs.numerator1 || 0);
  const den1 = Number(inputs.denominator1 || 1);
  const num2 = Number(inputs.numerator2 || 0);
  const den2 = Number(inputs.denominator2 || 1);
  const op = inputs.operation || 'add';

  if (den1 === 0 || den2 === 0) return { error: 'Denominator cannot be zero' };

  let resultNum, resultDen;

  switch (op) {
    case 'add':
      resultNum = num1 * den2 + num2 * den1;
      resultDen = den1 * den2;
      break;
    case 'subtract':
      resultNum = num1 * den2 - num2 * den1;
      resultDen = den1 * den2;
      break;
    case 'multiply':
      resultNum = num1 * num2;
      resultDen = den1 * den2;
      break;
    case 'divide':
      resultNum = num1 * den2;
      resultDen = den1 * num2;
      break;
    default:
      return { error: 'Invalid operation' };
  }

  const gcd = findGCD(Math.abs(resultNum), Math.abs(resultDen));
  const simplifiedNum = resultNum / gcd;
  const simplifiedDen = resultDen / gcd;

  return {
    type: 'cards',
    cards: [
      { label: 'Result (Simplified)', value: `${simplifiedNum}/${simplifiedDen}`, raw: simplifiedNum / simplifiedDen, highlight: true },
      { label: 'Result (Decimal)', value: formatNumber(simplifiedNum / simplifiedDen), raw: simplifiedNum / simplifiedDen },
      { label: 'First Fraction', value: `${num1}/${den1}`, raw: num1 / den1 },
      { label: 'Second Fraction', value: `${num2}/${den2}`, raw: num2 / den2 },
      { label: 'Operation', value: op, raw: op },
    ],
  };
}

function calcLCM(inputs) {
  const numberStr = inputs.numbers || '';
  const numbers = numberStr.split(',').map(n => Math.abs(parseInt(n.trim()))).filter(n => !isNaN(n) && n > 0);

  if (numbers.length === 0) return { error: 'Enter at least one valid number' };

  const lcm = numbers.reduce((a, b) => {
    return (a * b) / findGCD(a, b);
  });

  return {
    type: 'cards',
    cards: [
      { label: 'LCM', value: lcm, raw: lcm, highlight: true },
      { label: 'Numbers', value: numbers.join(', '), raw: numbers },
      { label: 'Count', value: numbers.length, raw: numbers.length },
    ],
  };
}

function calcHCF(inputs) {
  const numberStr = inputs.numbers || '';
  const numbers = numberStr.split(',').map(n => Math.abs(parseInt(n.trim()))).filter(n => !isNaN(n) && n > 0);

  if (numbers.length === 0) return { error: 'Enter at least one valid number' };

  const hcf = numbers.reduce((a, b) => findGCD(a, b));

  return {
    type: 'cards',
    cards: [
      { label: 'HCF (GCD)', value: hcf, raw: hcf, highlight: true },
      { label: 'Numbers', value: numbers.join(', '), raw: numbers },
      { label: 'Count', value: numbers.length, raw: numbers.length },
    ],
  };
}

function calcAverage(inputs) {
  const text = inputs.numbers || '';
  const numbers = text.split(/[\s,]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));

  if (numbers.length === 0) return { error: 'Enter at least one valid number' };

  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  let median;
  if (sorted.length % 2 === 0) {
    median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  } else {
    median = sorted[Math.floor(sorted.length / 2)];
  }

  const frequency = {};
  numbers.forEach(n => frequency[n] = (frequency[n] || 0) + 1);
  const mode = Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);

  const range = Math.max(...numbers) - Math.min(...numbers);

  return {
    type: 'cards',
    cards: [
      { label: 'Mean (Average)', value: formatNumber(mean), raw: mean, highlight: true },
      { label: 'Median', value: formatNumber(median), raw: median },
      { label: 'Mode', value: formatNumber(mode), raw: parseFloat(mode) },
      { label: 'Range', value: formatNumber(range), raw: range },
      { label: 'Count', value: numbers.length, raw: numbers.length },
      { label: 'Sum', value: formatNumber(numbers.reduce((a, b) => a + b, 0)), raw: numbers.reduce((a, b) => a + b, 0) },
    ],
  };
}

function calcProbability(inputs) {
  const type = inputs.calculation_type || 'simple_probability';
  const favorable = Number(inputs.favorable_outcomes || 0);
  const total = Number(inputs.total_outcomes || 1);
  const n = Number(inputs.n || 0);
  const r = Number(inputs.r || 0);

  if (type === 'simple_probability') {
    if (total <= 0) return { error: 'Total outcomes must be greater than 0' };
    const prob = favorable / total;
    const odds = favorable > 0 ? `${favorable}:${total - favorable}` : '0:' + total;
    return {
      type: 'cards',
      cards: [
        { label: 'Probability', value: formatNumber(prob, 4), raw: prob, highlight: true },
        { label: 'Percentage', value: `${(prob * 100).toFixed(2)}%`, raw: prob * 100 },
        { label: 'Odds', value: odds, raw: prob },
        { label: 'Favorable Outcomes', value: favorable, raw: favorable },
        { label: 'Total Outcomes', value: total, raw: total },
      ],
    };
  } else if (type === 'odds') {
    const totalOdds = favorable + total;
    const oddsProbability = favorable / totalOdds;
    return {
      type: 'cards',
      cards: [
        { label: 'Probability', value: formatNumber(oddsProbability, 4), raw: oddsProbability, highlight: true },
        { label: 'Percentage', value: `${(oddsProbability * 100).toFixed(2)}%`, raw: oddsProbability * 100 },
      ],
    };
  } else if (type === 'permutation') {
    if (r > n) return { error: 'r cannot be greater than n' };
    const perm = factorial(n) / factorial(n - r);
    return {
      type: 'cards',
      cards: [
        { label: 'Permutation (nPr)', value: perm, raw: perm, highlight: true },
        { label: 'n', value: n, raw: n },
        { label: 'r', value: r, raw: r },
      ],
    };
  } else if (type === 'combination') {
    if (r > n) return { error: 'r cannot be greater than n' };
    const comb = factorial(n) / (factorial(r) * factorial(n - r));
    return {
      type: 'cards',
      cards: [
        { label: 'Combination (nCr)', value: comb, raw: comb, highlight: true },
        { label: 'n', value: n, raw: n },
        { label: 'r', value: r, raw: r },
      ],
    };
  }

  return { error: 'Invalid calculation type' };
}

function calcStdDev(inputs) {
  const text = inputs.numbers || '';
  const numbers = text.split(/[\s,]+/).map(n => parseFloat(n.trim())).filter(n => !isNaN(n));

  if (numbers.length === 0) return { error: 'Enter at least one valid number' };

  const type = inputs.type || 'sample';
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / (type === 'sample' ? numbers.length - 1 : numbers.length);
  const stdDev = Math.sqrt(variance);

  return {
    type: 'cards',
    cards: [
      { label: 'Standard Deviation', value: formatNumber(stdDev), raw: stdDev, highlight: true },
      { label: 'Variance', value: formatNumber(variance), raw: variance },
      { label: 'Mean', value: formatNumber(mean), raw: mean },
      { label: 'Type', value: type, raw: type },
      { label: 'Count', value: numbers.length, raw: numbers.length },
    ],
  };
}

function calcMatrix(inputs) {
  const op = inputs.operation || 'add';

  try {
    const matrix1 = parseMatrix(inputs.matrix1);
    if (!matrix1) return { error: 'Invalid Matrix 1 format' };

    if (op === 'transpose') {
      const result = transposeMatrix(matrix1);
      return {
        type: 'cards',
        cards: [{ label: 'Transposed Matrix', value: formatMatrixDisplay(result), raw: result, highlight: true }],
      };
    }

    const matrix2 = parseMatrix(inputs.matrix2);
    if (!matrix2) return { error: 'Invalid Matrix 2 format' };

    let result;
    switch (op) {
      case 'add':
        if (matrix1.length !== matrix2.length || matrix1[0].length !== matrix2[0].length) {
          return { error: 'Matrices must have same dimensions for addition' };
        }
        result = matrix1.map((row, i) => row.map((val, j) => val + matrix2[i][j]));
        break;
      case 'subtract':
        if (matrix1.length !== matrix2.length || matrix1[0].length !== matrix2[0].length) {
          return { error: 'Matrices must have same dimensions for subtraction' };
        }
        result = matrix1.map((row, i) => row.map((val, j) => val - matrix2[i][j]));
        break;
      case 'multiply':
        if (matrix1[0].length !== matrix2.length) {
          return { error: 'Column of first matrix must equal row of second matrix' };
        }
        result = multiplyMatrices(matrix1, matrix2);
        break;
      case 'determinant':
        if (matrix1.length !== matrix1[0].length) {
          return { error: 'Determinant requires a square matrix' };
        }
        const det = calculateDeterminant(matrix1);
        return {
          type: 'cards',
          cards: [
            { label: 'Determinant', value: formatNumber(det), raw: det, highlight: true },
          ],
        };
      default:
        return { error: 'Invalid operation' };
    }

    return {
      type: 'cards',
      cards: [{ label: 'Result Matrix', value: formatMatrixDisplay(result), raw: result, highlight: true }],
    };
  } catch (e) {
    return { error: `Matrix calculation failed: ${e.message}` };
  }
}

function calcEquation(inputs) {
  const a = Number(inputs.a || 0);
  const b = Number(inputs.b || 0);
  const c = Number(inputs.c || 0);

  if (a === 0) return { error: 'Coefficient a cannot be zero' };

  const x = (c - b) / a;

  return {
    type: 'cards',
    cards: [
      { label: 'Solution (x)', value: formatNumber(x), raw: x, highlight: true },
      { label: 'Equation', value: `${a}x + ${b} = ${c}`, raw: x },
      { label: 'Verification', value: `${a} × ${formatNumber(x)} + ${b} = ${formatNumber(a * x + b)}`, raw: a * x + b },
    ],
  };
}

function calcPrimes(inputs) {
  const checkType = inputs.check_type || 'single';
  const number = Number(inputs.number || 0);
  const rangeEnd = Number(inputs.range_end || 0);

  if (checkType === 'single') {
    const isPrime = number > 1 && isPrimeNumber(number);
    return {
      type: 'cards',
      cards: [
        { label: 'Is Prime?', value: isPrime ? 'Yes' : 'No', raw: isPrime, highlight: true },
        { label: 'Number', value: number, raw: number },
        { label: 'Square Root', value: formatNumber(Math.sqrt(number)), raw: Math.sqrt(number) },
      ],
    };
  } else {
    const primes = [];
    for (let i = Math.max(2, number); i <= rangeEnd; i++) {
      if (isPrimeNumber(i)) primes.push(i);
    }
    return {
      type: 'cards',
      cards: [
        { label: 'Prime Numbers Found', value: primes.length, raw: primes.length, highlight: true },
        { label: 'Range', value: `${number} to ${rangeEnd}`, raw: primes.length },
        { label: 'Primes', value: primes.join(', '), raw: primes },
      ],
    };
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────

function findGCD(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function isPrimeNumber(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function parseMatrix(str) {
  if (!str) return null;
  try {
    const rows = str
      .trim()
      .replace(/\r\n/g, ';')
      .replace(/\n/g, ';')
      .split(';')
      .map(r => r.trim())
      .filter(Boolean)
      .map(r => r.split(',').map(v => parseFloat(v.trim())));

    if (!rows.length) return null;
    const width = rows[0].length;
    if (width === 0) return null;
    if (!rows.every(row => row.length === width)) return null;
    return rows.every(row => row.every(v => !isNaN(v))) ? rows : null;
  } catch {
    return null;
  }
}

function transposeMatrix(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function multiplyMatrices(a, b) {
  const result = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < b.length; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function calculateDeterminant(matrix) {
  const n = matrix.length;
  if (n === 1) return matrix[0][0];
  if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];

  let det = 0;
  for (let j = 0; j < n; j++) {
    const submatrix = matrix.slice(1).map(row => row.filter((_, k) => k !== j));
    det += matrix[0][j] * Math.pow(-1, j) * calculateDeterminant(submatrix);
  }
  return det;
}

function formatMatrixDisplay(matrix) {
  return matrix.map(row => '[' + row.map(v => formatNumber(v)).join(', ') + ']').join('\n');
}

// ─── Health & Fitness Calculations ────────────────────────────────────────────

function calcCalorieNeeds(inputs) {
  const age = Number(inputs.age);
  const gender = inputs.gender;
  const weight = Number(inputs.weight);
  const height = Number(inputs.height);
  const activity = inputs.activity_level;

  // Calculate BMR using Mifflin-St Jeor equation
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };

  const tdee = bmr * activityMultipliers[activity];

  // Weight goals
  const maintain = tdee;
  const mildLoss = maintain - 250; // 0.5kg/week
  const moderateLoss = maintain - 500; // 1kg/week
  const aggressiveLoss = maintain - 1000; // 2kg/week
  const mildGain = maintain + 250; // 0.5kg/week
  const moderateGain = maintain + 500; // 1kg/week

  return {
    type: 'cards',
    cards: [
      { label: 'Basal Metabolic Rate (BMR)', value: formatNumber(bmr) + ' cal/day', raw: bmr, highlight: true, description: 'Estimated calories burned per day at rest.' },
      { label: 'Daily Calorie Needs (TDEE)', value: formatNumber(tdee) + ' cal/day', raw: tdee, highlight: true, description: 'Estimated calories needed to maintain your current weight with activity.' },
      { label: 'Weight Maintenance', value: formatNumber(maintain) + ' cal/day', raw: maintain, description: 'Calories to stay at your current weight.' },
      { label: 'Mild Weight Loss (0.5kg/week)', value: formatNumber(mildLoss) + ' cal/day', raw: mildLoss, description: 'A modest deficit for steady weight loss.' },
      { label: 'Moderate Weight Loss (1kg/week)', value: formatNumber(moderateLoss) + ' cal/day', raw: moderateLoss, description: 'A moderate calorie reduction for faster results.' },
      { label: 'Aggressive Weight Loss (2kg/week)', value: formatNumber(aggressiveLoss) + ' cal/day', raw: aggressiveLoss, description: 'A larger deficit. Only use with medical guidance.' },
      { label: 'Mild Weight Gain (0.5kg/week)', value: formatNumber(mildGain) + ' cal/day', raw: mildGain, description: 'A gentle surplus to support healthy weight gain.' },
      { label: 'Moderate Weight Gain (1kg/week)', value: formatNumber(moderateGain) + ' cal/day', raw: moderateGain, description: 'A moderate surplus for muscle or healthy gain.' },
    ],
  };
}

function calcBodyFat(inputs) {
  const gender = inputs.gender;
  const waist = Number(inputs.waist);
  const neck = Number(inputs.neck);
  const height = Number(inputs.height);
  const hip = inputs.hip ? Number(inputs.hip) : null;

  let bodyFat;
  if (gender === 'male') {
    bodyFat = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
  } else {
    if (!hip) return { error: 'Hip measurement required for females' };
    bodyFat = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
  }

  bodyFat = Math.max(0, Math.min(50, bodyFat)); // Clamp to reasonable range

  // Categorize
  let category, healthRisk;
  if (gender === 'male') {
    if (bodyFat < 6) { category = 'Essential Fat'; healthRisk = 'Critical'; }
    else if (bodyFat < 14) { category = 'Athletes'; healthRisk = 'Excellent'; }
    else if (bodyFat < 18) { category = 'Fitness'; healthRisk = 'Good'; }
    else if (bodyFat < 25) { category = 'Average'; healthRisk = 'Fair'; }
    else { category = 'Obese'; healthRisk = 'Poor'; }
  } else {
    if (bodyFat < 10) { category = 'Essential Fat'; healthRisk = 'Critical'; }
    else if (bodyFat < 20) { category = 'Athletes'; healthRisk = 'Excellent'; }
    else if (bodyFat < 25) { category = 'Fitness'; healthRisk = 'Good'; }
    else if (bodyFat < 32) { category = 'Average'; healthRisk = 'Fair'; }
    else { category = 'Obese'; healthRisk = 'Poor'; }
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Body Fat Percentage', value: formatNumber(bodyFat) + '%', raw: bodyFat, highlight: true, description: 'Estimated body fat using the Navy formula.' },
      { label: 'Category', value: category, raw: category, description: 'Health classification based on body fat percentage.' },
      { label: 'Health Risk', value: healthRisk, raw: healthRisk, description: 'General risk level for your body composition.' },
      { label: 'Lean Body Mass', value: formatNumber((100 - bodyFat) / 100 * (gender === 'male' ? 70 : 60)) + ' kg (estimated)', raw: (100 - bodyFat) / 100 * (gender === 'male' ? 70 : 60), description: 'Rough estimate of lean mass based on body fat percentage.' },
    ],
  };
}

function calcWaterIntake(inputs) {
  const weight = Number(inputs.weight);
  const activity = inputs.activity_level;
  const climate = inputs.climate;

  // Base calculation: 30-35ml per kg
  let baseWater = weight * 35; // ml per day

  // Activity adjustment
  const activityMultipliers = {
    sedentary: 1.0,
    lightly_active: 1.2,
    moderately_active: 1.4,
    very_active: 1.6,
    extremely_active: 1.8
  };

  // Climate adjustment
  const climateMultipliers = {
    cool: 1.0,
    moderate: 1.1,
    hot: 1.3,
    very_hot: 1.5
  };

  const dailyWater = baseWater * activityMultipliers[activity] * climateMultipliers[climate];

  return {
    type: 'cards',
    cards: [
      { label: 'Daily Water Intake', value: formatNumber(dailyWater / 1000) + ' liters', raw: dailyWater / 1000, highlight: true, description: 'Hydration target based on weight, activity, and climate.' },
      { label: 'Base Requirement (35ml/kg)', value: formatNumber(baseWater / 1000) + ' liters', raw: baseWater / 1000, description: 'Baseline water need per kilogram of body weight.' },
      { label: 'Activity Adjustment', value: activityMultipliers[activity] + 'x', raw: activityMultipliers[activity], description: 'Multiplier applied for your activity level.' },
      { label: 'Climate Adjustment', value: climateMultipliers[climate] + 'x', raw: climateMultipliers[climate], description: 'Multiplier applied for local temperature.' },
      { label: 'Glasses (250ml)', value: Math.ceil(dailyWater / 250) + ' glasses', raw: Math.ceil(dailyWater / 250), description: 'Approximate number of 250ml servings.' },
      { label: 'Bottles (500ml)', value: Math.ceil(dailyWater / 500) + ' bottles', raw: Math.ceil(dailyWater / 500), description: 'Approximate number of 500ml bottles.' },
    ],
  };
}

function calcBMR(inputs) {
  const gender = inputs.gender;
  const age = Number(inputs.age);
  const weight = Number(inputs.weight);
  const height = Number(inputs.height);

  // Mifflin-St Jeor equation
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Harris-Benedict equation for comparison
  let harrisBenedict;
  if (gender === 'male') {
    harrisBenedict = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    harrisBenedict = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  return {
    type: 'cards',
    cards: [
      { label: 'BMR (Mifflin-St Jeor)', value: formatNumber(bmr) + ' cal/day', raw: bmr, highlight: true, description: 'Calories your body burns at rest based on age, height, weight, and gender.' },
      { label: 'BMR (Harris-Benedict)', value: formatNumber(harrisBenedict) + ' cal/day', raw: harrisBenedict, description: 'Alternate BMR estimate for comparison.' },
      { label: 'Sedentary (BMR × 1.2)', value: formatNumber(bmr * 1.2) + ' cal/day', raw: bmr * 1.2, description: 'Daily calories if you have light movement only.' },
      { label: 'Light Activity (BMR × 1.375)', value: formatNumber(bmr * 1.375) + ' cal/day', raw: bmr * 1.375, description: 'Daily calories for light exercise or walking.' },
      { label: 'Moderate Activity (BMR × 1.55)', value: formatNumber(bmr * 1.55) + ' cal/day', raw: bmr * 1.55, description: 'Daily calories for moderate activity and exercise.' },
      { label: 'Very Active (BMR × 1.725)', value: formatNumber(bmr * 1.725) + ' cal/day', raw: bmr * 1.725, description: 'Daily calories for intense exercise or physical work.' },
    ],
  };
}

function calcIdealWeight(inputs) {
  const gender = inputs.gender;
  const heightCm = Number(inputs.height);
  const heightIn = heightCm / 2.54;

  // Devine formula
  let ibwKg;
  if (gender === 'male') {
    ibwKg = 50 + 2.3 * (heightIn - 60);
  } else {
    ibwKg = 45.5 + 2.3 * (heightIn - 60);
  }

  // Robinson formula
  let robinsonKg;
  if (gender === 'male') {
    robinsonKg = 52 + 1.9 * (heightIn - 60);
  } else {
    robinsonKg = 49 + 1.7 * (heightIn - 60);
  }

  // Miller formula
  let millerKg;
  if (gender === 'male') {
    millerKg = 56.2 + 1.41 * (heightIn - 60);
  } else {
    millerKg = 53.1 + 1.36 * (heightIn - 60);
  }

  // Healthy weight range (±10%)
  const minWeight = ibwKg * 0.9;
  const maxWeight = ibwKg * 1.1;

  return {
    type: 'cards',
    cards: [
      { label: 'Ideal Weight (Devine)', value: formatNumber(ibwKg) + ' kg', raw: ibwKg, highlight: true, description: 'Primary ideal weight estimate based on gender and height.' },
      { label: 'Ideal Weight (Robinson)', value: formatNumber(robinsonKg) + ' kg', raw: robinsonKg, description: 'Alternate ideal weight estimate with a slightly different formula.' },
      { label: 'Ideal Weight (Miller)', value: formatNumber(millerKg) + ' kg', raw: millerKg, description: 'Another ideal weight reference using the Miller formula.' },
      { label: 'Healthy Range (Devine)', value: formatNumber(minWeight) + ' - ' + formatNumber(maxWeight) + ' kg', raw: { min: minWeight, max: maxWeight }, description: 'Approximate healthy weight range around the Devine ideal.' },
      { label: 'BMI at Ideal Weight', value: formatNumber(calculateBMI(ibwKg, heightCm)) + ' (Normal: 18.5-24.9)', raw: calculateBMI(ibwKg, heightCm), description: 'Expected BMI if you reach the Devine ideal weight.' },
    ],
  };
}

function calcPregnancy(inputs) {
  const lastPeriod = new Date(inputs.last_period_date);
  if (isNaN(lastPeriod.getTime())) {
    return { error: 'Valid last period date is required.' };
  }
  const dueDate = new Date(lastPeriod);
  dueDate.setDate(dueDate.getDate() + 280); // 40 weeks

  const today = new Date();
  const daysPregnant = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const weeksPregnant = Math.floor(daysPregnant / 7);
  const daysIntoWeek = daysPregnant % 7;

  const trimester = weeksPregnant < 13 ? 1 : weeksPregnant < 27 ? 2 : 3;

  // Conception date estimate (14 days after LMP)
  const conceptionDate = new Date(lastPeriod);
  conceptionDate.setDate(conceptionDate.getDate() + 14);

  return {
    type: 'cards',
    cards: [
      { label: 'Estimated Due Date', value: dueDate.toLocaleDateString(), raw: dueDate.toISOString(), highlight: true, description: 'Due date estimated from the first day of your last period.' },
      { label: 'Current Pregnancy Week', value: `${weeksPregnant} weeks, ${daysIntoWeek} days`, raw: { weeks: weeksPregnant, days: daysIntoWeek }, highlight: true, description: 'How far along your pregnancy is today.' },
      { label: 'Trimester', value: `Trimester ${trimester}`, raw: trimester, description: 'Current pregnancy trimester based on gestational weeks.' },
      { label: 'Estimated Conception Date', value: conceptionDate.toLocaleDateString(), raw: conceptionDate.toISOString(), description: 'Approximate date of conception based on a 14-day ovulation cycle.' },
      { label: 'Days Pregnant', value: daysPregnant + ' days', raw: daysPregnant, description: 'Total number of days since your last period began.' },
      { label: 'Weeks Remaining', value: Math.max(0, 40 - weeksPregnant) + ' weeks', raw: Math.max(0, 40 - weeksPregnant), description: 'Remaining weeks until the estimated due date.' },
    ],
  };
}

function calcOvulation(inputs) {
  const cycleLength = Number(inputs.cycle_length) || 28;
  const lastPeriod = new Date(inputs.last_period_date);
  if (isNaN(lastPeriod.getTime())) {
    return { error: 'Valid last period date is required.' };
  }

  // Ovulation typically occurs 14 days before next period
  const ovulationDate = new Date(lastPeriod);
  ovulationDate.setDate(ovulationDate.getDate() + cycleLength - 14);

  // Fertile window: 5 days before to 1 day after ovulation
  const fertileStart = new Date(ovulationDate);
  fertileStart.setDate(fertileStart.getDate() - 5);

  const fertileEnd = new Date(ovulationDate);
  fertileEnd.setDate(fertileEnd.getDate() + 1);

  // Next period
  const nextPeriod = new Date(lastPeriod);
  nextPeriod.setDate(nextPeriod.getDate() + cycleLength);

  return {
    type: 'cards',
    cards: [
      { label: 'Highlight Ovulation Date', value: ovulationDate.toLocaleDateString(), raw: ovulationDate.toISOString(), highlight: true, description: 'Predicted ovulation based on your cycle length and last period.' },
      { label: 'Fertile Window Start', value: fertileStart.toLocaleDateString(), raw: fertileStart.toISOString(), description: 'Beginning of the most fertile days of your cycle.' },
      { label: 'Fertile Window End', value: fertileEnd.toLocaleDateString(), raw: fertileEnd.toISOString(), description: 'End of the most fertile period.' },
      { label: 'Next Period Date', value: nextPeriod.toLocaleDateString(), raw: nextPeriod.toISOString(), description: 'Estimated start of your next menstrual cycle.' },
      { label: 'Cycle Length', value: cycleLength + ' days', raw: cycleLength, description: 'Number of days in your menstrual cycle.' },
      { label: 'Days Until Ovulation', value: Math.max(0, Math.floor((ovulationDate - new Date()) / (1000 * 60 * 60 * 24))) + ' days', raw: Math.max(0, Math.floor((ovulationDate - new Date()) / (1000 * 60 * 60 * 24))), description: 'How many days until ovulation from today.' },
    ],
  };
}

function calcSleep(inputs) {
  const wakeTime = inputs.desired_wake_time || '07:00'; // Format: "HH:MM"
  const cycles = Number(inputs.sleep_cycles) || 5;

  // Parse wake time
  const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
  const wakeDate = new Date();
  if (isNaN(wakeHour) || isNaN(wakeMinute)) {
    wakeDate.setHours(7, 0, 0, 0);
  } else {
    wakeDate.setHours(wakeHour, wakeMinute, 0, 0);
  }

  // Sleep cycle is 90 minutes
  const cycleMinutes = 90;

  const bedTimes = [];
  for (let i = cycles; i >= 4; i--) { // Show 4-8 cycles
    const totalMinutes = i * cycleMinutes;
    const bedTime = new Date(wakeDate);
    bedTime.setMinutes(bedTime.getMinutes() - totalMinutes);

    bedTimes.push({
      cycles: i,
      bedTime: bedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalSleep: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      raw: bedTime
    });
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Desired Wake Time', value: wakeTime, raw: wakeTime, highlight: true, description: 'Your target time to wake up each day.' },
      { label: 'Recommended Cycles', value: cycles + ' cycles (90min each)', raw: cycles, description: 'Ideal sleep cycles based on your selection.' },
      { label: 'Optimal Bedtime', value: bedTimes.find(b => b.cycles === cycles)?.bedTime || 'N/A', raw: bedTimes.find(b => b.cycles === cycles)?.raw, highlight: true, description: 'Best bedtime to complete full sleep cycles.' },
      { label: 'Total Sleep Time', value: bedTimes.find(b => b.cycles === cycles)?.totalSleep || 'N/A', raw: cycles * cycleMinutes, description: 'Approximate sleep duration for the selected cycle count.' },
      { label: 'Alternative (5 cycles)', value: bedTimes.find(b => b.cycles === 5)?.bedTime || 'N/A', raw: bedTimes.find(b => b.cycles === 5)?.raw, description: 'Alternative bedtime for 5 cycles.' },
      { label: 'Alternative (6 cycles)', value: bedTimes.find(b => b.cycles === 6)?.bedTime || 'N/A', raw: bedTimes.find(b => b.cycles === 6)?.raw, description: 'Alternative bedtime for 6 cycles.' },
    ],
  };
}

function calcDateDifference(inputs) {
  const start = parseDateOnly(inputs.start_date);
  const end = parseDateOnly(inputs.end_date);
  if (!start || !end) return { error: 'Valid start and end dates are required' };

  const reverse = end < start;
  const [fromDate, toDate] = reverse ? [end, start] : [start, end];
  const diff = calculateDateDifference(fromDate, toDate);
  const totalDays = Math.floor((toDate - fromDate) / (1000 * 60 * 60 * 24));

  return {
    type: 'cards',
    cards: [
      { label: 'Start Date', value: fromDate.toLocaleDateString(), raw: fromDate },
      { label: 'End Date', value: toDate.toLocaleDateString(), raw: toDate },
      { label: 'Years', value: String(diff.years), raw: diff.years },
      { label: 'Months', value: String(diff.months), raw: diff.months },
      { label: 'Days', value: String(diff.days), raw: diff.days },
      { label: 'Total Days', value: String(totalDays), raw: totalDays, highlight: true },
      { label: 'Direction', value: reverse ? 'End date is before start date' : 'Start date is before end date', raw: reverse ? 'reverse' : 'forward' },
    ],
  };
}

function calcCountdownTimer(inputs) {
  const target = parseDateTime(inputs.target_date, inputs.target_time);
  if (!target || Number.isNaN(target.getTime())) return { error: 'Valid target date and time are required' };

  const now = new Date();
  const diffMs = target - now;
  if (diffMs <= 0) {
    return {
      type: 'cards',
      cards: [
        { label: 'Target Date', value: target.toLocaleString(), raw: target, highlight: true },
        { label: 'Status', value: 'Target date has already passed', raw: 'past' },
      ],
    };
  }

  const seconds = Math.floor(diffMs / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return {
    type: 'cards',
    cards: [
      { label: 'Target Date', value: target.toLocaleString(), raw: target, highlight: true },
      { label: 'Days Remaining', value: String(days), raw: days },
      { label: 'Hours Remaining', value: String(hours), raw: hours },
      { label: 'Minutes Remaining', value: String(minutes), raw: minutes },
      { label: 'Seconds Remaining', value: String(secs), raw: secs, highlight: true },
    ],
  };
}

function calcStopwatch() {
  return {
    type: 'cards',
    cards: [
      { label: 'Elapsed Time', value: '00:00:00.000', raw: 0, highlight: true },
      { label: 'State', value: 'Ready', raw: 'ready' },
      { label: 'Lap Count', value: '0', raw: 0 },
      { label: 'Precision', value: 'Milliseconds', raw: 'ms' },
    ],
  };
}

function calcWorldClock(inputs) {
  const timezoneString = inputs.timezones || 'America/New_York, Europe/London, Asia/Tokyo, Australia/Sydney';
  const zones = timezoneString.split(',').map(zone => zone.trim()).filter(Boolean);
  const format24 = inputs.time_format === '24h';

  if (!zones.length) return { error: 'At least one time zone is required' };

  const cards = zones.map(zone => {
    const display = formatInTimeZone(new Date(), zone, format24);
    return { label: zone, value: display, raw: { zone, display } };
  });

  return {
    type: 'cards',
    cards,
  };
}

function calcTimezoneConverter(inputs) {
  const sourceValue = inputs.source_time || '';
  const sourceDate = parseDateTimeString(sourceValue);
  if (!sourceDate) return { error: 'Valid source time is required' };

  const sourceTimezone = inputs.source_timezone || 'UTC';
  const targetTimezone = inputs.target_timezone || 'UTC';

  return {
    type: 'cards',
    cards: [
      { label: 'Source Time', value: formatInTimeZone(sourceDate, sourceTimezone, false), raw: { sourceTimezone, sourceDate }, highlight: true },
      { label: 'Converted Time', value: formatInTimeZone(sourceDate, targetTimezone, false), raw: { targetTimezone } },
      { label: 'Source Zone', value: sourceTimezone, raw: sourceTimezone },
      { label: 'Target Zone', value: targetTimezone, raw: targetTimezone },
      { label: 'Offset', value: getTimeZoneOffset(sourceDate, targetTimezone) || 'N/A', raw: targetTimezone },
    ],
  };
}

function calcBusinessDays(inputs) {
  const start = parseDateOnly(inputs.start_date);
  const end = parseDateOnly(inputs.end_date);
  if (!start || !end) return { error: 'Valid start and end dates are required' };

  const holidays = (inputs.holidays || '')
    .split(',')
    .map(date => parseDateOnly(date.trim()))
    .filter(Boolean)
    .map(date => date.toDateString());

  const direction = end >= start ? 1 : -1;
  let date = new Date(start);
  let totalDays = 0;
  let businessDays = 0;
  let weekendDays = 0;

  while (true) {
    if (direction > 0 ? date <= end : date >= end) {
      totalDays += 1;
      const dateString = date.toDateString();
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const holiday = holidays.includes(dateString);
      if (weekend) weekendDays += 1;
      if (!weekend && !holiday) businessDays += 1;
      date.setDate(date.getDate() + direction);
    } else {
      break;
    }
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Start Date', value: start.toLocaleDateString(), raw: start },
      { label: 'End Date', value: end.toLocaleDateString(), raw: end },
      { label: 'Business Days', value: String(businessDays), raw: businessDays, highlight: true },
      { label: 'Weekend Days', value: String(weekendDays), raw: weekendDays },
      { label: 'Total Days', value: String(totalDays), raw: totalDays },
      { label: 'Holidays Excluded', value: String(holidays.length), raw: holidays.length },
    ],
  };
}

function calcDateCalculator(inputs) {
  const baseDate = parseDateOnly(inputs.base_date);
  const amount = Number(inputs.amount);
  const operation = inputs.operation;
  const unit = inputs.unit;

  if (!baseDate || isNaN(amount)) return { error: 'Valid date and amount are required' };

  const result = new Date(baseDate);
  const delta = operation === 'subtract' ? -amount : amount;

  if (unit === 'days') {
    result.setDate(result.getDate() + delta);
  } else if (unit === 'months') {
    result.setMonth(result.getMonth() + delta);
  } else if (unit === 'years') {
    result.setFullYear(result.getFullYear() + delta);
  }

  return {
    type: 'cards',
    cards: [
      { label: 'Base Date', value: baseDate.toLocaleDateString(), raw: baseDate },
      { label: 'Operation', value: `${operation} ${amount} ${unit}`, raw: { operation, amount, unit } },
      { label: 'Resulting Date', value: result.toLocaleDateString(), raw: result, highlight: true },
    ],
  };
}

function calcWeekNumber(inputs) {
  const date = parseDateOnly(inputs.date);
  if (!date) return { error: 'Valid date is required' };

  const { week, year } = getIsoWeek(date);
  return {
    type: 'cards',
    cards: [
      { label: 'Date', value: date.toLocaleDateString(), raw: date },
      { label: 'ISO Week Number', value: String(week), raw: week, highlight: true },
      { label: 'ISO Week Year', value: String(year), raw: year },
      { label: 'Week Label', value: `W${week} / ${year}`, raw: `${year}-W${week}` },
    ],
  };
}

function calcUnixTimestampConverter(inputs) {
  const type = inputs.conversion_type || 'timestamp_to_date';
  const timezone = inputs.timezone || 'UTC';

  if (type === 'timestamp_to_date') {
    const timestamp = Number(inputs.timestamp);
    if (isNaN(timestamp)) return { error: 'Valid unix timestamp is required' };
    const value = String(timestamp).length > 12 ? Number(timestamp) : Number(timestamp) * 1000;
    const date = new Date(value);
    if (isNaN(date.getTime())) return { error: 'Invalid unix timestamp' };

    return {
      type: 'json',
      value: {
        timestamp: timestamp,
        milliseconds: date.getTime(),
        date_utc: date.toISOString(),
        date_timezone: formatInTimeZone(date, timezone, false),
        timezone,
      },
    };
  }

  const date = parseDateOnly(inputs.date);
  const time = inputs.time || '00:00:00';
  if (!date) return { error: 'Valid date is required for conversion' };
  const dateTime = parseDateTime(inputs.date, time);
  if (!dateTime || isNaN(dateTime.getTime())) return { error: 'Valid time is required' };

  const seconds = Math.floor(dateTime.getTime() / 1000);
  const milliseconds = dateTime.getTime();

  return {
    type: 'json',
    value: {
      timestamp: seconds,
      milliseconds,
      date_utc: dateTime.toISOString(),
      date_timezone: formatInTimeZone(dateTime, timezone, false),
      timezone,
    },
  };
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const time = timeStr.trim();
  const timeValue = time.split(':').length === 2 ? `${time}:00` : time;
  const dateTime = new Date(`${dateStr}T${timeValue}`);
  return isNaN(dateTime.getTime()) ? null : dateTime;
}

function parseDateTimeString(dateTimeString) {
  if (!dateTimeString) return null;
  const normalized = dateTimeString.replace(' ', 'T');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

function parseDateTimeFromZone(dateTimeString, timeZone) {
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function formatInTimeZone(date, timeZone, use24h = true) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !use24h,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return 'Invalid time zone';
  }
}

function getTimeZoneOffset(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart ? tzPart.value : '';
  } catch {
    return '';
  }
}

function getIsoWeek(date) {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (temp.getUTCDay() + 6) % 7;
  temp.setUTCDate(temp.getUTCDate() - dayNumber + 3);
  const firstThursday = temp.valueOf();
  temp.setUTCMonth(0, 1);
  if (temp.getUTCDay() !== 4) {
    temp.setUTCMonth(0, 1 + ((4 - temp.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.round((firstThursday - temp) / (7 * 24 * 60 * 60 * 1000));
  return { week: weekNumber, year: temp.getUTCFullYear() };
}

function calculateDateDifference(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function countBusinessDays(start, end, holidays = []) {
  let direction = start <= end ? 1 : -1;
  let date = new Date(start);
  let businessDays = 0;

  while (direction > 0 ? date <= end : date >= end) {
    const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
    const dateKey = date.toDateString();
    if (!isWeekendDay && !holidays.includes(dateKey)) businessDays += 1;
    date.setDate(date.getDate() + direction);
  }

  return businessDays;
}

// Helper functions
function calculateBMI(weight, height) {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

// ─── SEO Tools ───────────────────────────────────────────────────────────────

function generateMetaTags(inputs) {
  const title = inputs.title || '';
  const description = inputs.description || '';
  const canonicalUrl = inputs.canonical_url || '';
  const keywords = inputs.keywords || '';
  const author = inputs.author || '';
  const robots = inputs.robots || 'index,follow';

  let metaTags = '';

  // Basic meta tags
  if (title) metaTags += `<meta name="title" content="${title.replace(/"/g, '&quot;')}">\n`;
  if (description) metaTags += `<meta name="description" content="${description.replace(/"/g, '&quot;')}">\n`;
  if (keywords) metaTags += `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}">\n`;
  if (author) metaTags += `<meta name="author" content="${author.replace(/"/g, '&quot;')}">\n`;
  if (robots) metaTags += `<meta name="robots" content="${robots}">\n`;

  // Canonical URL
  if (canonicalUrl) metaTags += `<link rel="canonical" href="${canonicalUrl}">\n`;

  // Viewport meta tag
  metaTags += `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n`;

  // Charset
  metaTags += `<meta charset="UTF-8">\n`;

  // Language
  metaTags += `<meta http-equiv="content-language" content="en">\n`;

  return {
    type: 'text',
    value: metaTags.trim(),
    label: 'Meta Tags HTML'
  };
}

function generateOpenGraph(inputs) {
  const title = inputs.title || '';
  const description = inputs.description || '';
  const url = inputs.url || '';
  const image = inputs.image || '';
  const siteName = inputs.site_name || '';
  const type = inputs.type || 'website';
  const locale = inputs.locale || 'en_US';

  let ogTags = '';

  ogTags += `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">\n`;
  ogTags += `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}">\n`;
  ogTags += `<meta property="og:url" content="${url}">\n`;
  ogTags += `<meta property="og:type" content="${type}">\n`;
  if (image) ogTags += `<meta property="og:image" content="${image}">\n`;
  if (siteName) ogTags += `<meta property="og:site_name" content="${siteName.replace(/"/g, '&quot;')}">\n`;
  ogTags += `<meta property="og:locale" content="${locale}">\n`;

  return {
    type: 'text',
    value: ogTags.trim(),
    label: 'Open Graph Meta Tags'
  };
}

function generateRobotsTxt(inputs) {
  const userAgent = inputs.user_agent || '*';
  const allow = inputs.allow || '/';
  const disallow = inputs.disallow || '';
  const sitemap = inputs.sitemap || '';

  let robotsTxt = `User-agent: ${userAgent}\n`;

  if (allow) {
    const allowPaths = allow.split('\n').filter(p => p.trim());
    allowPaths.forEach(path => {
      robotsTxt += `Allow: ${path.trim()}\n`;
    });
  }

  if (disallow) {
    const disallowPaths = disallow.split('\n').filter(p => p.trim());
    disallowPaths.forEach(path => {
      robotsTxt += `Disallow: ${path.trim()}\n`;
    });
  }

  if (sitemap) {
    robotsTxt += `\nSitemap: ${sitemap}\n`;
  }

  return {
    type: 'text',
    value: robotsTxt.trim(),
    label: 'robots.txt Content'
  };
}

function generateSitemap(inputs) {
  const urls = inputs.urls || '';
  const baseUrl = inputs.base_url || '';
  const changefreq = inputs.changefreq || 'weekly';
  const priority = inputs.priority || '0.5';

  if (!urls.trim()) return { error: 'At least one URL is required' };

  const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  urlList.forEach(url => {
    const fullUrl = url.startsWith('http') ? url : (baseUrl + url).replace(/\/+/g, '/');
    sitemap += '  <url>\n';
    sitemap += `    <loc>${fullUrl}</loc>\n`;
    sitemap += `    <changefreq>${changefreq}</changefreq>\n`;
    sitemap += `    <priority>${priority}</priority>\n`;
    sitemap += '  </url>\n';
  });

  sitemap += '</urlset>';

  return {
    type: 'text',
    value: sitemap,
    label: 'XML Sitemap'
  };
}

function generateSchema(inputs) {
  const type = inputs.schema_type || 'Article';
  const name = inputs.name || '';
  const description = inputs.description || '';
  const url = inputs.url || '';
  const image = inputs.image || '';
  const author = inputs.author || '';
  const datePublished = inputs.date_published || '';
  const dateModified = inputs.date_modified || '';

  let schema = {
    "@context": "https://schema.org",
    "@type": type,
    "name": name,
    "description": description,
    "url": url
  };

  if (image) schema.image = image;
  if (author) schema.author = { "@type": "Person", "name": author };
  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;

  return {
    type: 'json',
    value: JSON.stringify(schema, null, 2),
    label: 'JSON-LD Schema Markup'
  };
}

function buildUTM(inputs) {
  const url = inputs.url || '';
  const source = inputs.source || '';
  const medium = inputs.medium || '';
  const campaign = inputs.campaign || '';
  const term = inputs.term || '';
  const content = inputs.content || '';

  if (!url) return { error: 'Base URL is required' };

  let utmUrl = url;
  const params = [];

  if (source) params.push(`utm_source=${encodeURIComponent(source)}`);
  if (medium) params.push(`utm_medium=${encodeURIComponent(medium)}`);
  if (campaign) params.push(`utm_campaign=${encodeURIComponent(campaign)}`);
  if (term) params.push(`utm_term=${encodeURIComponent(term)}`);
  if (content) params.push(`utm_content=${encodeURIComponent(content)}`);

  if (params.length > 0) {
    const separator = url.includes('?') ? '&' : '?';
    utmUrl += separator + params.join('&');
  }

  return {
    type: 'text',
    value: utmUrl,
    label: 'UTM Tracking URL'
  };
}

function checkKeywordDensity(inputs) {
  const text = inputs.text || '';
  const keyword = inputs.keyword || '';

  if (!text || !keyword) return { error: 'Both text and keyword are required' };

  const normalizedText = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[“”‘’]/g, "'")
    .replace(/[^\w\s']/g, ' ');

  const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  const escapedKeyword = keyword
    .toLowerCase()
    .trim()
    .replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');

  const keywordCount = normalizedText.match(new RegExp(`\\b${escapedKeyword}\\b`, 'g'))?.length || 0;
  const density = totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;

  return {
    type: 'cards',
    cards: [
      { label: 'Keyword', value: keyword, raw: keyword, highlight: true },
      { label: 'Keyword Count', value: keywordCount.toString(), raw: keywordCount },
      { label: 'Total Words', value: totalWords.toString(), raw: totalWords },
      { label: 'Density', value: `${density.toFixed(2)}%`, raw: density, highlight: true },
      { label: 'Optimal Range', value: '1-3% (recommended)', raw: '1-3%' }
    ]
  };
}

function checkWordDensity(inputs) {
  const text = inputs.text || '';
  const minOccurrences = Number(inputs.min_occurrences) || 2;

  if (!text) return { error: 'Text is required' };

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount = {};

  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  const filteredWords = Object.entries(wordCount)
    .filter(([word, count]) => count >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20

  const cards = filteredWords.map(([word, count]) => ({
    label: word,
    value: `${count} times`,
    raw: count
  }));

  return {
    type: 'cards',
    cards: cards.length > 0 ? cards : [{ label: 'No words found', value: 'Try different text or lower minimum occurrences', raw: 0 }]
  };
}

function minifyHTML(inputs) {
  const html = inputs.html || '';

  if (!html) return { error: 'HTML content is required' };

  try {
    // Simple HTML minification - remove extra whitespace and newlines
    let minified = html
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*>\s*/g, '>') // Remove spaces around >
      .replace(/\s*<\s*/g, '<') // Remove spaces around <
      .trim();

    const originalSize = new Blob([html]).size;
    const minifiedSize = new Blob([minified]).size;
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;

    return {
      type: 'text',
      value: minified,
      label: 'Minified HTML',
      stats: {
        originalSize: `${originalSize} bytes`,
        minifiedSize: `${minifiedSize} bytes`,
        savings: `${savings} bytes (${savingsPercent}%)`
      }
    };
  } catch (e) {
    return { error: `Minification failed: ${e.message}` };
  }
}

function minifyCSS(inputs) {
  const css = inputs.css || '';

  if (!css) return { error: 'CSS content is required' };

  try {
    // Simple CSS minification
    let minified = css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*{\s*/g, '{') // Remove spaces around {
      .replace(/\s*}\s*/g, '}') // Remove spaces around }
      .replace(/\s*;\s*/g, ';') // Remove spaces around ;
      .replace(/\s*:\s*/g, ':') // Remove spaces around :
      .replace(/;\s*}/g, '}') // Remove ; before }
      .replace(/,\s*/g, ',') // Remove spaces after ,
      .trim();

    const originalSize = new Blob([css]).size;
    const minifiedSize = new Blob([minified]).size;
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;

    return {
      type: 'text',
      value: minified,
      label: 'Minified CSS',
      stats: {
        originalSize: `${originalSize} bytes`,
        minifiedSize: `${minifiedSize} bytes`,
        savings: `${savings} bytes (${savingsPercent}%)`
      }
    };
  } catch (e) {
    return { error: `Minification failed: ${e.message}` };
  }
}

function minifyJavaScript(inputs) {
  const js = inputs.javascript || '';

  if (!js) return { error: 'JavaScript content is required' };

  try {
    // Simple JS minification - remove comments and extra whitespace
    let minified = js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*{\s*/g, '{') // Remove spaces around {
      .replace(/\s*}\s*/g, '}') // Remove spaces around }
      .replace(/\s*\(\s*/g, '(') // Remove spaces around (
      .replace(/\s*\)\s*/g, ')') // Remove spaces around )
      .replace(/\s*;\s*/g, ';') // Remove spaces around ;
      .replace(/\s*,\s*/g, ',') // Remove spaces around ,
      .replace(/\s*=\s*/g, '=') // Remove spaces around =
      .replace(/\s*\+\s*/g, '+') // Remove spaces around +
      .replace(/\s*-\s*/g, '-') // Remove spaces around -
      .replace(/\s*\*\s*/g, '*') // Remove spaces around *
      .replace(/\s*\/\s*/g, '/') // Remove spaces around /
      .trim();

    const originalSize = new Blob([js]).size;
    const minifiedSize = new Blob([minified]).size;
    const savings = originalSize - minifiedSize;
    const savingsPercent = originalSize > 0 ? ((savings / originalSize) * 100).toFixed(1) : 0;

    return {
      type: 'text',
      value: minified,
      label: 'Minified JavaScript',
      stats: {
        originalSize: `${originalSize} bytes`,
        minifiedSize: `${minifiedSize} bytes`,
        savings: `${savings} bytes (${savingsPercent}%)`
      }
    };
  } catch (e) {
    return { error: `Minification failed: ${e.message}` };
  }
}