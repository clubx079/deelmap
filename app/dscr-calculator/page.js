'use client'
import { useState, useMemo } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { Lock, RotateCcw, Download } from 'lucide-react'
import Link from 'next/link'

// ── Helper components ──────────────────────────────────────────────

function InputField({ label, hint, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#737370]">{label}</label>
      <input
        className="text-[13px] font-medium text-[#1A1816] bg-[#F3F3F0] border border-[#E8E8E4] rounded px-3 py-2 outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[#D03839]/20 w-full"
        {...props}
      />
      {hint && <span className="text-[9.5px] text-[#A8A8A4] leading-tight">{hint}</span>}
    </div>
  )
}

function SelectField({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#737370]">{label}</label>
      <select
        className="text-[13px] font-medium text-[#1A1816] bg-[#F3F3F0] border border-[#E8E8E4] rounded px-3 py-2 outline-none focus:border-[#D03839] w-full"
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white border border-[#E8E8E4] rounded p-5 mb-3">
      <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-4 pb-2 border-b border-[#E8E8E4]">{title}</div>
      {children}
    </div>
  )
}

function LineItem({ label, value, valueClass = 'text-[#1A1816]', total = false }) {
  return (
    <div className={`flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0] last:border-0 ${total ? 'border-t border-[#E8E8E4] mt-1 pt-2 font-semibold' : ''}`}>
      <span className={`flex-1 pr-2 ${total ? 'text-[#1A1816] font-semibold' : 'text-[#737370]'}`}>{label}</span>
      <span className={`font-medium whitespace-nowrap ${valueClass}`}>{value}</span>
    </div>
  )
}

// ── Math helpers ───────────────────────────────────────────────────

function pmt(r, n, pv) {
  if (r === 0) return pv / n
  return pv * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}
function loanBal(r, n, pv, k) {
  if (r === 0) return pv - (pv / n) * k
  return pv * Math.pow(1 + r, k) - pmt(r, n, pv) * (Math.pow(1 + r, k) - 1) / r
}
function calcIRR(cfs) {
  let rate = 0.1
  for (let i = 0; i < 200; i++) {
    let npv = 0, d = 0
    for (let t = 0; t < cfs.length; t++) {
      const f = Math.pow(1 + rate, t)
      npv += cfs[t] / f
      d -= t * cfs[t] / (f * (1 + rate))
    }
    const delta = npv / d
    rate -= delta
    if (Math.abs(delta) < 1e-8) break
  }
  return rate
}
function money(n) { return '$' + Math.abs(Math.round(n)).toLocaleString() }
function pctFmt(n) { return (n * 100).toFixed(2) + '%' }

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULTS = {
  purchasePrice: 80000, arv: 165000, propType: 'sfr', strategy: 'brrrr',
  condition: 'distressed', market: 'primary', yearBuilt: 1978, sqft: 1400,
  downPct: 10, closingCosts: 1900, inspectionFees: 375, assignmentFee: 0,
  agentBuy: 0, envSurvey: 0, hoaTransfer: 0, otherAcqCosts: 0,
  repairs: 18000, contingencyPct: 10, gcFees: 0, permits: 400,
  staging: 0, landscaping: 300, appliances: 1000, furnishing: 0,
  hmlRate: 11, hmlOriginPts: 2, hmlDocFees: 500, hmlLtv: 90,
  hmlCarry: 4, hmlExtension: 0, drawSchedule: 'upfront', hmlInterestType: 'io',
  privateMoney: 0, privateRate: 0, partnerEquity: 0, prefReturn: 0,
  loanType: 'dscr', dscrRate: 7.25, dscrTerm: 30, dscrAmort: 30,
  balloonTerm: 0, dscrLtv: 75, refiClosePct: 3, dscrPoints: 1,
  pmi: 0, prepayPenalty: 0, rateBuydown: 0, lenderReserves: 6, minDscr: 1.25,
  grossRent: 1800, otherIncome: 0, parkingIncome: 0, laundryIncome: 0,
  vacancyPct: 8, creditLossPct: 0, rentGrowth: 3, leaseType: 'annual',
  strNightly: 0, strOccupancy: 0, strPlatformFee: 0, strMgmtFee: 0,
  strCleaning: 0, strStays: 0, strSupplies: 0, strLicense: 0,
  propTax: 1600, insurance: 1000, floodIns: 0, umbrellaIns: 150,
  hoa: 0, utilities: 0, trash: 0, lawn: 220, pest: 110,
  security: 0, internet: 0, llcFees: 100,
  maintPct: 7, capexPct: 5, mgmtPct: 0, leasingFee: 0,
  eviction: 0, turnover: 350, accounting: 250, legal: 0,
  software: 0, travel: 0, advertising: 0, otherExpenses: 0,
  expenseGrowth: 2, taxGrowth: 3, insGrowth: 5,
  appraisal: 165000, appraisalFee: 550, monthsBeforeRefi: 4, seasoning: 6,
  holdYears: 5, appreciation: 4, sellerCommission: 5, sellerClose: 1.5,
  capGainsTax: 20, deprRecapture: 25, stateTax: 5, exchange1031: 'no',
  flipSalePrice: 165000, flipCommission: 5, flipClose: 2,
  flipHoldingCost: 1100, flipTaxRate: 37, targetProfit: 25000,
}

// ── Main page ──────────────────────────────────────────────────────

export default function DSCRCalculatorPage() {
  const { user } = useAuth()
  const [inputs, setInputs] = useState(DEFAULTS)
  const [activeTab, setActiveTab] = useState('acquisition')

  const upd = (key) => (e) => setInputs(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))
  const updSel = (key) => (e) => setInputs(p => ({ ...p, [key]: e.target.value }))

  // ── Calculations ────────────────────────────────────────────────
  const r = useMemo(() => {
    const i = inputs

    // Acquisition
    const purchase = i.purchasePrice
    const arv = i.arv
    const downPct = i.downPct / 100
    const closing = i.closingCosts
    const inspect = i.inspectionFees
    const assign = i.assignmentFee
    const agentBuy = i.agentBuy
    const envSurvey = i.envSurvey
    const hoaXfer = i.hoaTransfer
    const otherAcq = i.otherAcqCosts

    // Rehab
    const rehabBase = i.repairs
    const contingPct = i.contingencyPct / 100
    const gcFees = i.gcFees
    const permits = i.permits
    const staging = i.staging
    const landscape = i.landscaping
    const appliances = i.appliances
    const furnishing = i.furnishing
    const totalRehab = rehabBase * (1 + contingPct) + gcFees + permits + staging + landscape + appliances + furnishing

    // HML
    const hmlRate = i.hmlRate / 100
    const hmlPts = i.hmlOriginPts / 100
    const hmlDoc = i.hmlDocFees
    const hmlLtvPct = i.hmlLtv / 100
    const hmlCarry = i.hmlCarry
    const hmlExt = i.hmlExtension

    const hmlLoan = purchase * hmlLtvPct
    const downAmt = hmlLtvPct >= 1.0 ? 0
      : hmlLtvPct > 0 ? Math.max(purchase - hmlLoan, 0)
        : purchase * downPct
    const hmlOrig = hmlLoan * hmlPts
    const hmlInt = hmlLoan * (hmlRate / 12) * hmlCarry

    const otherEntry = closing + inspect + assign + agentBuy + envSurvey + hoaXfer + otherAcq
    const totalCashIn = downAmt + hmlOrig + hmlDoc + hmlInt + hmlExt + totalRehab + otherEntry

    // DSCR / perm loan
    const dscrRateAnn = i.dscrRate / 100
    const dscrTerm = i.dscrTerm
    const dscrAmort = i.dscrAmort || i.dscrTerm
    const dscrLtvPct = i.dscrLtv / 100
    const refiClosePct = i.refiClosePct / 100
    const dscrPtsPct = i.dscrPoints / 100
    const appraisal = i.appraisal
    const apprFee = i.appraisalFee
    const pmiMo = i.pmi
    const rateBuydown = i.rateBuydown
    const lenderRes = i.lenderReserves
    const minDscr = i.minDscr

    const dscrLoan = i.loanType === 'none' ? 0 : appraisal * dscrLtvPct
    const refiClose = dscrLoan * refiClosePct
    const dscrPtsAmt = dscrLoan * dscrPtsPct
    const netProceeds = dscrLoan - hmlLoan - refiClose - apprFee - dscrPtsAmt
    const cashBack = Math.min(Math.max(netProceeds, 0), totalCashIn)
    const dscrMo = dscrRateAnn / 12
    const dscrN = dscrAmort * 12
    const piMo = i.loanType === 'none' ? 0 : pmt(dscrMo, dscrN, dscrLoan)

    const pitia = piMo + (i.propTax / 12) + (i.insurance / 12)
    const reserveHeld = pitia * lenderRes

    const cashLeftInDeal = Math.max(totalCashIn - cashBack, 0)

    // Income
    let grossRentMo = i.grossRent + i.otherIncome + i.parkingIncome + i.laundryIncome
    if (i.leaseType === 'str') {
      const strRev = i.strNightly * (i.strOccupancy / 100) * 30
      const strPlatCost = strRev * (i.strPlatformFee / 100)
      const strMgmtCost = strRev * (i.strMgmtFee / 100)
      const strClean = i.strCleaning * i.strStays
      const strSupp = i.strSupplies
      grossRentMo = strRev - strPlatCost - strMgmtCost - strClean - strSupp
    }

    const vacPct = (i.vacancyPct + i.creditLossPct) / 100
    const vacancyMo = grossRentMo * vacPct
    const egiMo = grossRentMo - vacancyMo

    // Expenses monthly
    const propTaxAnn = i.propTax
    const insAnn = i.insurance + i.floodIns + i.umbrellaIns
    const fixedAnn = i.hoa + i.utilities + i.trash + i.lawn + i.pest + i.security + i.internet + i.llcFees
    const strLicAnn = i.leaseType === 'str' ? i.strLicense : 0
    const maintPct = i.maintPct / 100
    const capexPct = i.capexPct / 100
    const mgmtPct = i.mgmtPct / 100
    const leasingAnn = i.leasingFee
    const varAnn = i.eviction + i.turnover + i.accounting + i.legal + i.software + i.travel + i.advertising + i.otherExpenses + strLicAnn

    const taxInsMo = (propTaxAnn + insAnn) / 12
    const fixedMo = fixedAnn / 12
    const maintMo = grossRentMo * (maintPct + capexPct)
    const mgmtMo = egiMo * mgmtPct + leasingAnn / 12
    const varMo = varAnn / 12

    const totalExpMo = piMo + taxInsMo + fixedMo + maintMo + mgmtMo + varMo + pmiMo
    const moCF = egiMo - totalExpMo

    // Annual
    const annEGI = egiMo * 12
    const annPI = piMo * 12
    const annTaxIns = propTaxAnn + insAnn
    const annFixed = fixedAnn
    const annMaint = maintMo * 12
    const annMgmt = mgmtMo * 12
    const annVar = varAnn + pmiMo * 12
    const annNOI = moCF * 12

    // DSCR ratio
    const noi4dscr = annEGI - annTaxIns - annFixed - annMaint - annMgmt - annVar
    const dscrRatio = annPI > 0 ? noi4dscr / annPI : 999

    // Return metrics
    const coc = cashLeftInDeal > 1 ? annNOI / cashLeftInDeal : Infinity
    const capRate = arv > 0 ? noi4dscr / arv : 0
    const grm = annEGI > 0 ? purchase / (grossRentMo * 12) : 0
    const ltvAtAcq = purchase > 0 ? hmlLoan / purchase : 0
    const equityRefi = appraisal - dscrLoan
    const monthsRec = moCF > 1 ? cashLeftInDeal / moCF : Infinity

    // Hold & sale
    const holdYears = Math.max(1, Math.round(i.holdYears))
    const apprecPct = i.appreciation / 100
    const rentGrowth = i.rentGrowth / 100
    const expGrowth = i.expenseGrowth / 100

    const salePriceProj = arv * Math.pow(1 + apprecPct, holdYears)
    const sellComm = salePriceProj * (i.sellerCommission / 100)
    const sellClose = salePriceProj * (i.sellerClose / 100)
    const holdMonths = holdYears * 12
    const loanBalSale = i.loanType === 'none' ? 0 : loanBal(dscrMo, dscrN, dscrLoan, holdMonths)
    const saleGross = salePriceProj - sellComm - sellClose - loanBalSale - totalCashIn
    const taxPct = i.exchange1031 === 'yes' ? 0 : (i.capGainsTax + i.stateTax) / 100
    const saleTax = Math.max(saleGross, 0) * taxPct
    const saleNet = saleGross - saleTax

    // IRR
    let irr = NaN
    try {
      if (cashLeftInDeal > 1) {
        const cfs = [-cashLeftInDeal]
        for (let yr = 1; yr <= holdYears; yr++) {
          const rScale = Math.pow(1 + rentGrowth, yr)
          const eScale = Math.pow(1 + expGrowth, yr)
          const yrEGI = annEGI * rScale
          const yrOp = (annTaxIns + annFixed + annMaint + annMgmt + annVar) * eScale
          cfs.push(yrEGI - yrOp - annPI)
        }
        cfs[cfs.length - 1] += saleNet + loanBalSale
        const raw = calcIRR(cfs)
        irr = (isFinite(raw) && raw > -1 && raw < 5) ? raw : NaN
      }
    } catch (e) { }

    // Equity multiple
    const totalReturn = annNOI * holdYears + saleNet
    const emx = cashLeftInDeal > 1 ? (cashLeftInDeal + totalReturn) / cashLeftInDeal : 0

    // Flip
    const flipAllIn = downAmt + hmlOrig + hmlDoc + hmlInt + hmlExt + totalRehab + otherEntry + rateBuydown + i.prepayPenalty
    const flipSale = i.flipSalePrice
    const flipComm = flipSale * (i.flipCommission / 100)
    const flipCl = flipSale * (i.flipClose / 100)
    const flipHold = i.flipHoldingCost * hmlCarry
    const flipGross = flipSale - flipComm - flipCl - flipAllIn - flipHold
    const flipTax = flipGross > 0 && i.exchange1031 !== 'yes' ? flipGross * (i.flipTaxRate / 100) : 0
    const flipNet = flipGross - flipTax

    const isFlip = i.strategy === 'flip'
    const dispSale = isFlip ? flipSale : salePriceProj
    const dispCosts = isFlip ? flipComm + flipCl : sellComm + sellClose
    const dispBal = isFlip ? 0 : loanBalSale
    const dispGross = isFlip ? flipGross : saleGross
    const dispTax = isFlip ? flipTax : saleTax
    const dispNet = isFlip ? flipNet : saleNet

    // Benchmarks
    const rule50 = annEGI * 0.5 - annPI
    const rtv = purchase > 0 ? grossRentMo / purchase : 0
    const oer = annEGI > 0 ? (annEGI - annNOI - annPI) / annEGI : 0
    const beoOcc = grossRentMo > 0 ? totalExpMo / grossRentMo : 0
    const units = { sfr: 1, duplex: 2, triplex: 3, fourplex: 4, smallmf: 8, commercial: 1 }[i.propType] || 1
    const ppu = purchase / units
    const ppsf = i.sqft > 0 ? purchase / i.sqft : 0
    const debtYield = dscrLoan > 0 ? noi4dscr / dscrLoan : 0
    const targetMet = dispNet >= i.targetProfit

    // 5-yr projection rows
    const projRows = []
    for (let yr = 1; yr <= Math.min(holdYears, 10); yr++) {
      const rS = Math.pow(1 + rentGrowth, yr)
      const eS = Math.pow(1 + expGrowth, yr)
      const yrEGI = annEGI * rS
      const yrOp = (annTaxIns + annFixed + annMaint + annMgmt + annVar) * eS + annPI
      const yrNOI = yrEGI - yrOp
      const yrVal = arv * Math.pow(1 + apprecPct, yr)
      projRows.push({ yr, yrNOI, yrVal, yrEGI, yrOp: yrOp - annPI })
    }

    return {
      purchase, arv, downAmt, hmlLoan, hmlOrig, hmlDoc, hmlInt, hmlExt,
      totalRehab, otherEntry, rateBuydown, prepayPenalty: i.prepayPenalty,
      totalCashIn, dscrLoan, dscrLtvPct, refiClose, dscrPtsAmt, apprFee,
      netProceeds, cashBack, reserveHeld, cashLeftInDeal,
      grossRentMo, vacancyMo, egiMo, piMo, pmiMo, taxInsMo, fixedMo,
      mgmtMo, maintMo, varMo, moCF,
      annEGI, annPI, annTaxIns, annFixed, annMaint, annMgmt, annVar, annNOI,
      noi4dscr, dscrRatio, minDscr,
      coc, capRate, grm, ltvAtAcq, equityRefi, monthsRec, irr, emx,
      dscrRateAnn: i.dscrRate, dscrTerm, dscrAmort,
      dispSale, dispCosts, dispBal, dispGross, dispTax, dispNet,
      exchange1031: i.exchange1031,
      rule50, rtv, oer, beoOcc, ppsf, ppu, debtYield, targetMet,
      targetProfit: i.targetProfit, isFlip, projRows,
    }
  }, [inputs])

  // ── Auth gate ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 bg-[#F3F3F0] border border-[#E8E8E4] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-[#737370]" />
            </div>
            <h2 className="text-[18px] font-semibold text-[#1A1816] mb-2">Sign in to access the underwriting tool</h2>
            <p className="text-[13px] text-[#737370] mb-6">This tool is available to DeelMap members.</p>
            <Link href="/login" className="inline-block bg-[#D03839] text-white text-[13px] font-semibold px-6 py-3 rounded hover:bg-[#b83233] transition-colors">
              Login
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── DSCR badge helper ──────────────────────────────────────────
  function DscrBadge({ ratio, min }) {
    const isGood = ratio >= min
    const isWarn = !isGood && ratio >= 1.0
    const cls = isGood ? 'bg-[#E8F5EE] text-[#1A6B3C]' : isWarn ? 'bg-[#FFF8E8] text-[#A06800]' : 'bg-[#FDF0EF] text-[#D03839]'
    const mark = isGood ? '✓' : isWarn ? '!' : '✗'
    const label = isFinite(ratio) ? ratio.toFixed(2) + 'x' : '∞'
    return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${cls}`}>{label} {mark}</span>
  }

  function RuleBadge({ pass, warn, value }) {
    const cls = pass ? 'bg-[#E8F5EE] text-[#1A6B3C]' : warn ? 'bg-[#FFF8E8] text-[#A06800]' : 'bg-[#FDF0EF] text-[#D03839]'
    const mark = pass ? '✓' : '✗'
    return <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${cls}`}>{value} {mark}</span>
  }

  // ── PDF export ─────────────────────────────────────────────────
  function handleExport() {
    window.print()
  }

  // ── Tab content ────────────────────────────────────────────────
  const TABS = ['acquisition', 'financing', 'income', 'expenses', 'refi', 'results']
  const TAB_LABELS = { acquisition: 'Acquisition', financing: 'Financing', income: 'Income', expenses: 'Expenses', refi: 'Refi / Exit', results: 'Results' }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <Navbar />
      <div className="pt-[80px]">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#E8E8E4]">
            <div>
              <h1 className="text-[18px] font-bold text-[#1A1816]">Advanced REI Underwriting Tool</h1>
              <div className="text-[10.5px] text-[#737370] uppercase tracking-[0.1em] mt-0.5">DeelMap | Investment Analysis</div>
            </div>
            <button
              onClick={() => setInputs(DEFAULTS)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-[#737370] border border-[#E8E8E4] rounded px-3 py-1.5 hover:text-[#1A1816] hover:border-[#1A1816] transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Hero KPI bar */}
          <div className="bg-white border border-[#E8E8E4] rounded grid grid-cols-6 mb-4 overflow-hidden">
            {[
              { label: 'Total Cash In', value: money(r.totalCashIn), cls: 'text-[#D03839]' },
              { label: 'Cash Back at Refi', value: money(r.cashBack), cls: 'text-[#1A6B3C]' },
              {
                label: 'Cash Left in Deal',
                value: r.cashLeftInDeal < 100 ? '$0' : money(r.cashLeftInDeal),
                cls: r.cashLeftInDeal < 100 ? 'text-[#1A6B3C]' : 'text-[#1B4F9B]'
              },
              {
                label: 'Monthly Cash Flow',
                value: (r.moCF >= 0 ? '+' : '−') + money(r.moCF),
                cls: r.moCF >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'
              },
              { label: 'Cash-on-Cash', value: isFinite(r.coc) ? pctFmt(r.coc) : '∞', cls: 'text-[#A06800]' },
              { label: 'Est. IRR', value: isNaN(r.irr) ? 'N/A' : (r.irr * 100).toFixed(2) + '%', cls: 'text-[#A06800]' },
            ].map((s, idx) => (
              <div key={idx} className={`p-4 ${idx < 5 ? 'border-r border-[#E8E8E4]' : ''}`}>
                <div className={`text-[17px] font-semibold leading-none mb-1.5 ${s.cls}`}>{s.value}</div>
                <div className="text-[9.5px] font-medium text-[#737370] uppercase tracking-[0.06em] leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[12px] font-medium px-4 py-2 rounded border transition-colors ${activeTab === tab
                  ? 'bg-[#1A1816] text-white border-[#1A1816]'
                  : 'border-[#E8E8E4] text-[#737370] hover:text-[#1A1816] hover:border-[#1A1816]'
                  }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* ── ACQUISITION TAB ── */}
          {activeTab === 'acquisition' && (
            <div>
              <Card title="Property & Strategy">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Purchase Price ($)" type="number" value={inputs.purchasePrice} onChange={upd('purchasePrice')} />
                  <InputField label="After-Repair Value ($)" type="number" value={inputs.arv} onChange={upd('arv')} hint="For LTV, cap rate, equity calcs" />
                  <SelectField label="Property Type" value={inputs.propType} onChange={updSel('propType')}>
                    <option value="sfr">Single Family (SFR)</option>
                    <option value="duplex">Duplex</option>
                    <option value="triplex">Triplex</option>
                    <option value="fourplex">Fourplex</option>
                    <option value="smallmf">Small MF (5–20 units)</option>
                    <option value="commercial">Commercial</option>
                  </SelectField>
                  <SelectField label="Investment Strategy" value={inputs.strategy} onChange={updSel('strategy')}>
                    <option value="brrrr">BRRRR</option>
                    <option value="buynhold">Buy &amp; Hold (no refi)</option>
                    <option value="flip">Fix &amp; Flip</option>
                  </SelectField>
                  <SelectField label="Property Condition" value={inputs.condition} onChange={updSel('condition')}>
                    <option value="distressed">Distressed / Heavy Rehab</option>
                    <option value="light">Light Cosmetic</option>
                    <option value="turnkey">Turnkey</option>
                  </SelectField>
                  <SelectField label="Market Type" value={inputs.market} onChange={updSel('market')}>
                    <option value="primary">Primary Market</option>
                    <option value="secondary">Secondary Market</option>
                    <option value="tertiary">Tertiary / Rural</option>
                  </SelectField>
                  <InputField label="Year Built" type="number" value={inputs.yearBuilt} onChange={upd('yearBuilt')} hint="Affects CapEx assumptions" />
                  <InputField label="Square Footage" type="number" value={inputs.sqft} onChange={upd('sqft')} />
                </div>
              </Card>

              <Card title="Acquisition Costs">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Down Payment (%)" type="number" step="0.5" value={inputs.downPct} onChange={upd('downPct')} hint="Used only when HML LTV = 0%" />
                  <InputField label="Buyer Closing Costs ($)" type="number" value={inputs.closingCosts} onChange={upd('closingCosts')} hint="Title, escrow, transfer tax" />
                  <InputField label="Inspection & Due Diligence ($)" type="number" value={inputs.inspectionFees} onChange={upd('inspectionFees')} />
                  <InputField label="Wholesaler / Assignment Fee ($)" type="number" value={inputs.assignmentFee} onChange={upd('assignmentFee')} />
                  <InputField label="Buyer's Agent Commission ($)" type="number" value={inputs.agentBuy} onChange={upd('agentBuy')} />
                  <InputField label="Environmental / Survey ($)" type="number" value={inputs.envSurvey} onChange={upd('envSurvey')} />
                  <InputField label="HOA Transfer Fee ($)" type="number" value={inputs.hoaTransfer} onChange={upd('hoaTransfer')} />
                  <InputField label="Other Acquisition Costs ($)" type="number" value={inputs.otherAcqCosts} onChange={upd('otherAcqCosts')} />
                </div>
              </Card>

              <Card title="Rehab / Construction Budget">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Estimated Rehab Budget ($)" type="number" value={inputs.repairs} onChange={upd('repairs')} />
                  <InputField label="Contingency Reserve (%)" type="number" step="5" value={inputs.contingencyPct} onChange={upd('contingencyPct')} hint="Added to rehab budget" />
                  <InputField label="GC / Labor Markup ($)" type="number" value={inputs.gcFees} onChange={upd('gcFees')} />
                  <InputField label="Permits & Plans ($)" type="number" value={inputs.permits} onChange={upd('permits')} />
                  <InputField label="Staging / Photography ($)" type="number" value={inputs.staging} onChange={upd('staging')} />
                  <InputField label="Landscaping / Exterior ($)" type="number" value={inputs.landscaping} onChange={upd('landscaping')} />
                  <InputField label="Appliances ($)" type="number" value={inputs.appliances} onChange={upd('appliances')} />
                  <InputField label="Furnishing (STR) ($)" type="number" value={inputs.furnishing} onChange={upd('furnishing')} />
                </div>
              </Card>
            </div>
          )}

          {/* ── FINANCING TAB ── */}
          {activeTab === 'financing' && (
            <div>
              <Card title="Hard Money / Bridge Loan">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="HML Interest Rate (%)" type="number" step="0.25" value={inputs.hmlRate} onChange={upd('hmlRate')} />
                  <InputField label="HML Origination Points (%)" type="number" step="0.25" value={inputs.hmlOriginPts} onChange={upd('hmlOriginPts')} />
                  <InputField label="HML Doc Fees ($)" type="number" value={inputs.hmlDocFees} onChange={upd('hmlDocFees')} />
                  <InputField label="HML LTV (% of purchase)" type="number" step="5" value={inputs.hmlLtv} onChange={upd('hmlLtv')} />
                  <InputField label="Carry Period (months)" type="number" step="1" value={inputs.hmlCarry} onChange={upd('hmlCarry')} />
                  <InputField label="Extension Fee ($)" type="number" value={inputs.hmlExtension} onChange={upd('hmlExtension')} hint="If loan needs extending" />
                  <SelectField label="Draw Schedule" value={inputs.drawSchedule} onChange={updSel('drawSchedule')}>
                    <option value="upfront">All Upfront</option>
                    <option value="draws">Progress Draws</option>
                  </SelectField>
                  <SelectField label="Interest Type" value={inputs.hmlInterestType} onChange={updSel('hmlInterestType')}>
                    <option value="io">Interest Only</option>
                    <option value="pi">P&amp;I Amortizing</option>
                  </SelectField>
                </div>
              </Card>

              <Card title="Private Money / Equity Partner">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Private Money Amount ($)" type="number" value={inputs.privateMoney} onChange={upd('privateMoney')} hint="Supplements or replaces HML" />
                  <InputField label="Private Money Rate (%)" type="number" step="0.5" value={inputs.privateRate} onChange={upd('privateRate')} />
                  <InputField label="Partner Equity Share (%)" type="number" step="5" value={inputs.partnerEquity} onChange={upd('partnerEquity')} hint="% of profits / cash flow" />
                  <InputField label="Preferred Return (%)" type="number" step="1" value={inputs.prefReturn} onChange={upd('prefReturn')} />
                </div>
              </Card>

              <Card title="Long-Term / Permanent Loan">
                <div className="grid grid-cols-4 gap-3">
                  <SelectField label="Loan Type" value={inputs.loanType} onChange={updSel('loanType')}>
                    <option value="dscr">DSCR Loan</option>
                    <option value="conv">Conventional</option>
                    <option value="fha">FHA</option>
                    <option value="portfolio">Portfolio / Local Bank</option>
                    <option value="seller">Seller Financing</option>
                    <option value="none">All Cash / No Loan</option>
                  </SelectField>
                  <InputField label="Interest Rate (%)" type="number" step="0.125" value={inputs.dscrRate} onChange={upd('dscrRate')} />
                  <InputField label="Loan Term (years)" type="number" step="5" value={inputs.dscrTerm} onChange={upd('dscrTerm')} />
                  <InputField label="Amortization (years)" type="number" step="5" value={inputs.dscrAmort} onChange={upd('dscrAmort')} hint="If balloon loan, enter amort" />
                  <InputField label="Balloon Term (years)" type="number" step="1" value={inputs.balloonTerm} onChange={upd('balloonTerm')} hint="0 = no balloon" />
                  <InputField label="LTV at Refi (%)" type="number" step="5" value={inputs.dscrLtv} onChange={upd('dscrLtv')} />
                  <InputField label="Refi Closing Costs (%)" type="number" step="0.25" value={inputs.refiClosePct} onChange={upd('refiClosePct')} />
                  <InputField label="Points on DSCR Loan (%)" type="number" step="0.25" value={inputs.dscrPoints} onChange={upd('dscrPoints')} />
                  <InputField label="PMI / MIP (monthly $)" type="number" value={inputs.pmi} onChange={upd('pmi')} hint="FHA/Conv if <20% down" />
                  <InputField label="Prepayment Penalty ($)" type="number" value={inputs.prepayPenalty} onChange={upd('prepayPenalty')} />
                  <InputField label="Interest Rate Buydown ($)" type="number" value={inputs.rateBuydown} onChange={upd('rateBuydown')} />
                  <InputField label="Lender Reserves Required (mo)" type="number" step="1" value={inputs.lenderReserves} onChange={upd('lenderReserves')} hint="Months PITIA held in reserve" />
                  <InputField label="Min DSCR Required" type="number" step="0.05" value={inputs.minDscr} onChange={upd('minDscr')} hint="Lender minimum threshold" />
                </div>
              </Card>
            </div>
          )}

          {/* ── INCOME TAB ── */}
          {activeTab === 'income' && (
            <div>
              <Card title="Rental Income">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Monthly Gross Rent ($)" type="number" value={inputs.grossRent} onChange={upd('grossRent')} />
                  <InputField label="Other Monthly Income ($)" type="number" value={inputs.otherIncome} onChange={upd('otherIncome')} hint="Laundry, storage, pet fees" />
                  <InputField label="Parking / Garage Income ($)" type="number" value={inputs.parkingIncome} onChange={upd('parkingIncome')} />
                  <InputField label="Coin Laundry / Vending ($)" type="number" value={inputs.laundryIncome} onChange={upd('laundryIncome')} />
                  <InputField label="Vacancy Rate (%)" type="number" step="1" value={inputs.vacancyPct} onChange={upd('vacancyPct')} />
                  <InputField label="Credit Loss / Bad Debt (%)" type="number" step="0.5" value={inputs.creditLossPct} onChange={upd('creditLossPct')} />
                  <InputField label="Annual Rent Growth (%)" type="number" step="0.5" value={inputs.rentGrowth} onChange={upd('rentGrowth')} hint="Used in 5-yr projection + IRR" />
                  <SelectField label="Lease Type" value={inputs.leaseType} onChange={updSel('leaseType')}>
                    <option value="annual">Annual Lease</option>
                    <option value="mth">Month-to-Month</option>
                    <option value="str">Short-Term Rental (STR)</option>
                  </SelectField>
                </div>
              </Card>

              {inputs.leaseType === 'str' && (
                <Card title="Short-Term Rental (STR) Details">
                  <div className="grid grid-cols-4 gap-3">
                    <InputField label="Avg Nightly Rate ($)" type="number" value={inputs.strNightly} onChange={upd('strNightly')} />
                    <InputField label="Occupancy Rate (%)" type="number" step="5" value={inputs.strOccupancy} onChange={upd('strOccupancy')} />
                    <InputField label="Platform Fee (%)" type="number" step="0.5" value={inputs.strPlatformFee} onChange={upd('strPlatformFee')} hint="Airbnb / VRBO host fee" />
                    <InputField label="STR Mgmt Fee (%)" type="number" step="5" value={inputs.strMgmtFee} onChange={upd('strMgmtFee')} />
                    <InputField label="Cleaning Cost / Stay ($)" type="number" value={inputs.strCleaning} onChange={upd('strCleaning')} />
                    <InputField label="Avg Stays / Month" type="number" value={inputs.strStays} onChange={upd('strStays')} />
                    <InputField label="Supplies / Toiletries (mo $)" type="number" value={inputs.strSupplies} onChange={upd('strSupplies')} />
                    <InputField label="STR License / Permit (ann $)" type="number" value={inputs.strLicense} onChange={upd('strLicense')} />
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── EXPENSES TAB ── */}
          {activeTab === 'expenses' && (
            <div>
              <Card title="Fixed Operating Expenses — Annual">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Property Tax ($)" type="number" value={inputs.propTax} onChange={upd('propTax')} />
                  <InputField label="Hazard Insurance ($)" type="number" value={inputs.insurance} onChange={upd('insurance')} />
                  <InputField label="Flood Insurance ($)" type="number" value={inputs.floodIns} onChange={upd('floodIns')} />
                  <InputField label="Umbrella / Landlord Policy ($)" type="number" value={inputs.umbrellaIns} onChange={upd('umbrellaIns')} />
                  <InputField label="HOA / Condo Fees ($)" type="number" value={inputs.hoa} onChange={upd('hoa')} />
                  <InputField label="Utilities (landlord-paid) ($)" type="number" value={inputs.utilities} onChange={upd('utilities')} hint="Water/sewer if landlord pays" />
                  <InputField label="Trash / Recycling ($)" type="number" value={inputs.trash} onChange={upd('trash')} />
                  <InputField label="Lawn / Snow Removal ($)" type="number" value={inputs.lawn} onChange={upd('lawn')} />
                  <InputField label="Pest Control ($)" type="number" value={inputs.pest} onChange={upd('pest')} />
                  <InputField label="Security / Alarm ($)" type="number" value={inputs.security} onChange={upd('security')} />
                  <InputField label="Internet (if landlord-paid) ($)" type="number" value={inputs.internet} onChange={upd('internet')} />
                  <InputField label="License / LLC / Reg Fees ($)" type="number" value={inputs.llcFees} onChange={upd('llcFees')} />
                </div>
              </Card>

              <Card title="Variable & Percentage-Based Expenses">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Maintenance % of Rent" type="number" step="0.5" value={inputs.maintPct} onChange={upd('maintPct')} hint="Rule of thumb: 5–10%" />
                  <InputField label="CapEx Reserve % of Rent" type="number" step="0.5" value={inputs.capexPct} onChange={upd('capexPct')} hint="Roof, HVAC, plumbing, etc." />
                  <InputField label="Property Management (%)" type="number" step="1" value={inputs.mgmtPct} onChange={upd('mgmtPct')} />
                  <InputField label="Leasing / Placement Fee (ann $)" type="number" value={inputs.leasingFee} onChange={upd('leasingFee')} />
                  <InputField label="Eviction Reserve (ann $)" type="number" value={inputs.eviction} onChange={upd('eviction')} />
                  <InputField label="Turnover Costs (ann $)" type="number" value={inputs.turnover} onChange={upd('turnover')} hint="Paint, carpet, deep clean" />
                  <InputField label="Accounting / Bookkeeping ($)" type="number" value={inputs.accounting} onChange={upd('accounting')} />
                  <InputField label="Legal / Entity Mgmt ($)" type="number" value={inputs.legal} onChange={upd('legal')} />
                  <InputField label="Software / Tools ($)" type="number" value={inputs.software} onChange={upd('software')} hint="PM software, analytics, etc." />
                  <InputField label="Travel / Inspection ($)" type="number" value={inputs.travel} onChange={upd('travel')} />
                  <InputField label="Advertising / Listing ($)" type="number" value={inputs.advertising} onChange={upd('advertising')} />
                  <InputField label="Other Operating ($)" type="number" value={inputs.otherExpenses} onChange={upd('otherExpenses')} />
                </div>
              </Card>

              <Card title="Growth & Inflation Assumptions (5-yr Projection)">
                <div className="grid grid-cols-3 gap-3">
                  <InputField label="Annual Expense Growth (%)" type="number" step="0.5" value={inputs.expenseGrowth} onChange={upd('expenseGrowth')} />
                  <InputField label="Property Tax Growth (%/yr)" type="number" step="1" value={inputs.taxGrowth} onChange={upd('taxGrowth')} />
                  <InputField label="Insurance Inflation (%/yr)" type="number" step="1" value={inputs.insGrowth} onChange={upd('insGrowth')} />
                </div>
              </Card>
            </div>
          )}

          {/* ── REFI / EXIT TAB ── */}
          {activeTab === 'refi' && (
            <div>
              <Card title="Refinance Assumptions">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Appraised Value at Refi ($)" type="number" value={inputs.appraisal} onChange={upd('appraisal')} />
                  <InputField label="Appraisal Fee ($)" type="number" value={inputs.appraisalFee} onChange={upd('appraisalFee')} />
                  <InputField label="Months Until Refi" type="number" step="1" value={inputs.monthsBeforeRefi} onChange={upd('monthsBeforeRefi')} />
                  <InputField label="Lender Seasoning Required (mo)" type="number" step="1" value={inputs.seasoning} onChange={upd('seasoning')} hint="Most DSCR lenders: 6–12 mo" />
                </div>
              </Card>

              <Card title="Hold & Sale Analysis">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Hold Period (years)" type="number" step="1" value={inputs.holdYears} onChange={upd('holdYears')} />
                  <InputField label="Annual Appreciation (%)" type="number" step="0.5" value={inputs.appreciation} onChange={upd('appreciation')} />
                  <InputField label="Seller Agent Commission (%)" type="number" step="0.5" value={inputs.sellerCommission} onChange={upd('sellerCommission')} />
                  <InputField label="Seller Closing Costs (%)" type="number" step="0.25" value={inputs.sellerClose} onChange={upd('sellerClose')} />
                  <InputField label="Capital Gains Tax Rate (%)" type="number" step="1" value={inputs.capGainsTax} onChange={upd('capGainsTax')} hint="Long-term rate estimate" />
                  <InputField label="Depreciation Recapture (%)" type="number" step="1" value={inputs.deprRecapture} onChange={upd('deprRecapture')} />
                  <InputField label="State Income Tax (%)" type="number" step="1" value={inputs.stateTax} onChange={upd('stateTax')} />
                  <SelectField label="1031 Exchange?" value={inputs.exchange1031} onChange={updSel('exchange1031')}>
                    <option value="no">No — pay taxes at sale</option>
                    <option value="yes">Yes — defer all taxes</option>
                  </SelectField>
                </div>
              </Card>

              <Card title="Fix & Flip Analysis">
                <div className="grid grid-cols-4 gap-3">
                  <InputField label="Flip Sale Price ($)" type="number" value={inputs.flipSalePrice} onChange={upd('flipSalePrice')} />
                  <InputField label="Seller Agent Commission (%)" type="number" step="0.5" value={inputs.flipCommission} onChange={upd('flipCommission')} />
                  <InputField label="Flip Closing Costs (%)" type="number" step="0.25" value={inputs.flipClose} onChange={upd('flipClose')} />
                  <InputField label="Monthly Holding Cost ($)" type="number" value={inputs.flipHoldingCost} onChange={upd('flipHoldingCost')} hint="Taxes, utils, HML int." />
                  <InputField label="Flip Tax Rate (%)" type="number" step="1" value={inputs.flipTaxRate} onChange={upd('flipTaxRate')} hint="Short-term = ordinary income" />
                  <InputField label="Target Flip Profit ($)" type="number" value={inputs.targetProfit} onChange={upd('targetProfit')} hint="Min acceptable profit" />
                </div>
              </Card>
            </div>
          )}

          {/* ── RESULTS TAB ── */}
          {activeTab === 'results' && (
            <div>
              {/* Export bar */}
              <div className="flex items-center justify-between mb-4 px-4 py-3 bg-[#1A1816] border border-[#1A1816] rounded">
                <span className="text-[12px] font-medium text-white/60">Generate a professional investment report with all metrics</span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 text-[12px] font-semibold text-white bg-[#D03839] border-none rounded px-5 py-2 hover:bg-[#b83233] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF Report
                </button>
              </div>

              {/* Phase cards */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Phase 1 */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <span className="inline-block text-[9.5px] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-[#EEF3FB] text-[#1B4F9B] mb-3">Phase 1 — All-In Entry Cost</span>
                  <LineItem label="Purchase price" value={money(r.purchase)} />
                  <LineItem label="Down payment" value={'−' + money(r.downAmt)} valueClass="text-[#D03839]" />
                  <LineItem label="Hard money loan" value={money(r.hmlLoan)} valueClass="text-[#1B4F9B]" />
                  <LineItem label="HML origination + doc" value={'−' + money(r.hmlOrig + r.hmlDoc)} valueClass="text-[#D03839]" />
                  <LineItem label="HML carry interest" value={'−' + money(r.hmlInt + r.hmlExt)} valueClass="text-[#D03839]" />
                  <LineItem label="Rehab (w/ contingency)" value={'−' + money(r.totalRehab)} valueClass="text-[#D03839]" />
                  <LineItem label="Closing + acq costs" value={'−' + money(r.otherEntry)} valueClass="text-[#D03839]" />
                  <LineItem label="Other entry costs" value={'−' + money(r.rateBuydown + r.prepayPenalty)} valueClass="text-[#D03839]" />
                  <LineItem label="Total cash deployed" value={money(r.totalCashIn)} valueClass="text-[#D03839]" total />
                </div>

                {/* Phase 2 */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <span className="inline-block text-[9.5px] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-[#E8F5EE] text-[#1A6B3C] mb-3">Phase 2 — DSCR Refi</span>
                  <LineItem label="Appraised value" value={money(r.appraisal || inputs.appraisal)} />
                  <LineItem label={`New loan @ ${Math.round(r.dscrLtvPct * 100)}% LTV`} value={money(r.dscrLoan)} valueClass="text-[#1B4F9B]" />
                  <LineItem label="Pay off hard money" value={'−' + money(r.hmlLoan)} valueClass="text-[#D03839]" />
                  <LineItem label="Refi closing + points" value={'−' + money(r.refiClose + r.dscrPtsAmt)} valueClass="text-[#D03839]" />
                  <LineItem label="Appraisal fee" value={'−' + money(r.apprFee)} valueClass="text-[#D03839]" />
                  <LineItem label="Net proceeds" value={(r.netProceeds >= 0 ? '+' : '−') + money(r.netProceeds)} valueClass={r.netProceeds >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'} />
                  <LineItem label="Lender reserve held" value={'−' + money(r.reserveHeld)} valueClass="text-[#D03839]" />
                  <LineItem label="Proceeds at Closing" value={'+' + money(r.cashBack)} valueClass="text-[#1A6B3C]" total />
                  <LineItem
                    label="Net cash left in deal"
                    value={r.cashLeftInDeal < 100 ? '$0 — full recycle' : money(r.cashLeftInDeal)}
                    valueClass={r.cashLeftInDeal < 100 ? 'text-[#1A6B3C]' : 'text-[#1A1816]'}
                    total
                  />
                </div>

                {/* Phase 3 */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <span className="inline-block text-[9.5px] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-full bg-[#FFF8E8] text-[#A06800] mb-3">Phase 3 — Monthly P&L</span>
                  <LineItem label="Gross rent + other" value={money(r.grossRentMo)} valueClass="text-[#1A6B3C]" />
                  <LineItem label="Vacancy + credit loss" value={'−' + money(r.vacancyMo)} valueClass="text-[#D03839]" />
                  <LineItem label="Effective gross income" value={money(r.egiMo)} />
                  <LineItem label="DSCR P&I payment" value={'−' + money(r.piMo + r.pmiMo)} valueClass="text-[#D03839]" />
                  <LineItem label="Tax + insurance" value={'−' + money(r.taxInsMo)} valueClass="text-[#D03839]" />
                  <LineItem label="HOA + utilities" value={'−' + money(r.fixedMo)} valueClass="text-[#D03839]" />
                  <LineItem label="Mgmt + leasing" value={'−' + money(r.mgmtMo)} valueClass="text-[#D03839]" />
                  <LineItem label="Maint + CapEx reserve" value={'−' + money(r.maintMo)} valueClass="text-[#D03839]" />
                  <LineItem label="Other operating" value={'−' + money(r.varMo)} valueClass="text-[#D03839]" />
                  <LineItem
                    label="Monthly cash flow"
                    value={(r.moCF >= 0 ? '+' : '−') + money(r.moCF)}
                    valueClass={r.moCF >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'}
                    total
                  />
                </div>
              </div>

              {/* Annual + Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-3 pb-2 border-b border-[#E8E8E4]">Annual Breakdown</div>
                  <LineItem label="Effective gross income" value={money(r.annEGI)} />
                  <LineItem label="Annual debt service" value={'−' + money(r.annPI + r.pmiMo * 12)} valueClass="text-[#D03839]" />
                  <LineItem label="Taxes + insurance" value={'−' + money(r.annTaxIns)} valueClass="text-[#D03839]" />
                  <LineItem label="HOA + utilities + fixed" value={'−' + money(r.annFixed)} valueClass="text-[#D03839]" />
                  <LineItem label="Maintenance + CapEx" value={'−' + money(r.annMaint)} valueClass="text-[#D03839]" />
                  <LineItem label="Management + leasing" value={'−' + money(r.annMgmt)} valueClass="text-[#D03839]" />
                  <LineItem label="Other operating" value={'−' + money(r.annVar)} valueClass="text-[#D03839]" />
                  <LineItem
                    label="Net annual cash flow"
                    value={(r.annNOI >= 0 ? '+' : '−') + money(r.annNOI)}
                    valueClass={r.annNOI >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'}
                    total
                  />
                </div>

                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-3 pb-2 border-b border-[#E8E8E4]">Return & Lender Metrics</div>
                  <LineItem label="DSCR loan amount" value={money(r.dscrLoan)} valueClass="text-[#1B4F9B]" />
                  <LineItem label="Rate / term / amort" value={`${r.dscrRateAnn}% / ${r.dscrTerm}yr / ${r.dscrAmort}yr amort`} />
                  <LineItem label="Monthly P&I" value={money(r.piMo) + '/mo'} />
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370] flex-1 pr-2">DSCR ratio</span>
                    <DscrBadge ratio={r.dscrRatio} min={r.minDscr} />
                  </div>
                  <LineItem label="Lender min DSCR" value={r.minDscr.toFixed(2) + 'x required'} />
                  <LineItem label="LTV at acquisition" value={pctFmt(r.ltvAtAcq)} />
                  <LineItem label="Equity at refi" value={money(r.equityRefi)} valueClass="text-[#1A6B3C]" />
                  <LineItem label="Cash-on-cash return" value={isFinite(r.coc) ? pctFmt(r.coc) : '∞'} />
                  <LineItem label="Cap rate (on ARV)" value={pctFmt(r.capRate)} />
                  <LineItem label="Gross rent multiplier" value={r.grm.toFixed(1) + 'x'} />
                  <LineItem label="Estimated IRR" value={isNaN(r.irr) ? 'N/A' : (r.irr * 100).toFixed(2) + '%'} valueClass="text-[#A06800]" />
                  <LineItem label="Equity multiple (hold)" value={isFinite(r.emx) && r.cashLeftInDeal > 1 ? r.emx.toFixed(2) + 'x' : 'N/A'} />
                  <div className="flex justify-between items-baseline py-1 text-[11.5px]">
                    <span className="text-[#737370] flex-1 pr-2">Months to recover</span>
                    {!isFinite(r.monthsRec) || r.monthsRec <= 0
                      ? <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-[#E8F5EE] text-[#1A6B3C]">Recovered ✓</span>
                      : <span className="font-medium text-[#1A1816]">{Math.ceil(r.monthsRec)} months</span>
                    }
                  </div>
                </div>
              </div>

              {/* 3-col bottom */}
              <div className="grid grid-cols-3 gap-3">
                {/* 5-Year Projection */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-3 pb-2 border-b border-[#E8E8E4]">5-Year Cash Flow Projection</div>
                  <div className="flex justify-between text-[9px] font-semibold uppercase tracking-[0.06em] text-[#737370] pb-1 mb-1 border-b border-[#E8E8E4]">
                    <span>Year</span>
                    <span>EGI</span>
                    <span>Expenses</span>
                    <span>Cash Flow</span>
                  </div>
                  {r.projRows.map(({ yr, yrNOI, yrVal, yrEGI, yrOp }) => (
                    <div key={yr} className="flex justify-between items-baseline py-1 text-[11px] border-b border-[#F3F3F0] last:border-0">
                      <span className="text-[#737370] w-10">Yr {yr}</span>
                      <span className="text-[#1A1816] w-16 text-right">{money(yrEGI)}</span>
                      <span className="text-[#D03839] w-16 text-right">{money(yrOp)}</span>
                      <span className={`w-16 text-right font-medium ${yrNOI >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'}`}>
                        {(yrNOI >= 0 ? '+' : '−') + money(yrNOI)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Flip / Sale exit */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-3 pb-2 border-b border-[#E8E8E4]">Flip / Sale & Exit Analysis</div>
                  <LineItem label="Sale / flip price" value={money(r.dispSale)} />
                  <LineItem label="Commission + closing" value={'−' + money(r.dispCosts)} valueClass="text-[#D03839]" />
                  <LineItem label="Remaining loan balance" value={'−' + money(r.dispBal)} valueClass="text-[#D03839]" />
                  <LineItem
                    label="Gross profit"
                    value={(r.dispGross >= 0 ? '+' : '−') + money(r.dispGross)}
                    valueClass={r.dispGross >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'}
                  />
                  <LineItem
                    label="Tax liability (est.)"
                    value={r.exchange1031 === 'yes' ? '$0 (1031 deferred)' : '−' + money(r.dispTax)}
                    valueClass={r.exchange1031 === 'yes' ? 'text-[#1A6B3C]' : 'text-[#D03839]'}
                  />
                  <LineItem
                    label="Net profit / proceeds"
                    value={(r.dispNet >= 0 ? '+' : '−') + money(r.dispNet)}
                    valueClass={r.dispNet >= 0 ? 'text-[#1A6B3C]' : 'text-[#D03839]'}
                    total
                  />
                </div>

                {/* Quick Benchmarks */}
                <div className="bg-white border border-[#E8E8E4] rounded p-4">
                  <div className="text-[10.5px] font-semibold text-[#D03839] uppercase tracking-[0.1em] mb-3 pb-2 border-b border-[#E8E8E4]">Quick Benchmarks</div>
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370]">1% Rule</span>
                    <RuleBadge pass={r.rtv >= 0.01} warn={false} value={pctFmt(r.rtv)} />
                  </div>
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370]">2% Rule</span>
                    <RuleBadge pass={r.rtv >= 0.02} warn={r.rtv >= 0.015} value={pctFmt(r.rtv)} />
                  </div>
                  <LineItem
                    label="50% Rule NOI (est.)"
                    value={(r.rule50 >= 0 ? '+' : '−') + money(r.rule50)}
                    valueClass={r.rule50 >= 0 ? 'text-[#1A1816]' : 'text-[#D03839]'}
                  />
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370]">Operating expense ratio</span>
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${r.oer <= 0.5 ? 'bg-[#E8F5EE] text-[#1A6B3C]' : r.oer <= 0.65 ? 'bg-[#FFF8E8] text-[#A06800]' : 'bg-[#FDF0EF] text-[#D03839]'}`}>
                      {pctFmt(r.oer)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370]">Break-even occupancy</span>
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${r.beoOcc <= 0.85 ? 'bg-[#E8F5EE] text-[#1A6B3C]' : r.beoOcc <= 0.95 ? 'bg-[#FFF8E8] text-[#A06800]' : 'bg-[#FDF0EF] text-[#D03839]'}`}>
                      {pctFmt(Math.min(r.beoOcc, 1))}
                    </span>
                  </div>
                  <LineItem label="Price per sq ft" value={r.ppsf > 0 ? '$' + Math.round(r.ppsf) + '/sf' : 'N/A'} />
                  <LineItem label="Price per unit" value={money(r.ppu) + '/unit'} />
                  <div className="flex justify-between items-baseline py-1 text-[11.5px] border-b border-[#F3F3F0]">
                    <span className="text-[#737370]">Rent-to-value ratio</span>
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${r.rtv >= 0.01 ? 'bg-[#E8F5EE] text-[#1A6B3C]' : r.rtv >= 0.007 ? 'bg-[#FFF8E8] text-[#A06800]' : 'bg-[#FDF0EF] text-[#D03839]'}`}>
                      {pctFmt(r.rtv)}
                    </span>
                  </div>
                  <LineItem label="Debt yield" value={pctFmt(r.debtYield)} />
                  <div className="flex justify-between items-baseline py-1 text-[11.5px]">
                    <span className="text-[#737370]">Target profit met?</span>
                    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded ${r.targetMet ? 'bg-[#E8F5EE] text-[#1A6B3C]' : 'bg-[#FDF0EF] text-[#D03839]'}`}>
                      {r.targetMet ? 'Yes ✓' : 'No ✗'} ({money(r.targetProfit)} target)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  )
}
