'use client'
import { useState, useEffect, useRef } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/hooks/useAuth'
import { RegistrationModal } from '@/components/RegistrationModal'
import { Info, Download, RotateCcw } from 'lucide-react'

export default function DSCRLoanPage() {
  const { user, loading } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    if (loading) return
    setShowLoginModal(!user)
  }, [user, loading])

  // Input states
  const [loanType, setLoanType] = useState('amortizing')
  const [loanPurpose, setLoanPurpose] = useState('purchase')
  const [monthlyRent, setMonthlyRent] = useState(2500)
  const [annualTaxes, setAnnualTaxes] = useState(3600)
  const [annualInsurance, setAnnualInsurance] = useState(1200)
  const [annualHOA, setAnnualHOA] = useState(0)
  const [purchasePrice, setPurchasePrice] = useState(300000)
  const [loanAmount, setLoanAmount] = useState(240000)
  const [ltv, setLtv] = useState(80)
  const [interestRate, setInterestRate] = useState(7.5)
  const [termInYears, setTermInYears] = useState(30)
  const [originationFee, setOriginationFee] = useState(1500)
  const [originationFeeMode, setOriginationFeeMode] = useState('fixed')
  const [originationFeePercent, setOriginationFeePercent] = useState(2.0)
  const [loanFees, setLoanFees] = useState(1995)
  const [titleFees, setTitleFees] = useState(2400)
  const [escrow, setEscrow] = useState(0)
  const [prepaidInterest, setPrepaidInterest] = useState(0)
  const [prepaidInsurance, setPrepaidInsurance] = useState(0)
  const [paymentReserve, setPaymentReserve] = useState(0)
  const [currentLoanBalance, setCurrentLoanBalance] = useState(0)
  const [cashOutEnabled, setCashOutEnabled] = useState(false)
  const [cashOutAmount, setCashOutAmount] = useState(0)
  const [vacancyRate, setVacancyRate] = useState(5)
  const [propertyManagementFee, setPropertyManagementFee] = useState(8)

  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [hasChanged, setHasChanged] = useState(false)

  // Output states
  const [monthlyPayment, setMonthlyPayment] = useState(0)
  const [dscr, setDscr] = useState(0)
  const [monthlyCashflow, setMonthlyCashflow] = useState(0)
  const [proceeds, setProceeds] = useState(0)
  const [liquidityToVerify, setLiquidityToVerify] = useState(0)
  const [effectiveMonthlyRent, setEffectiveMonthlyRent] = useState(0)
  const [noi, setNoi] = useState(0)
  const [capRate, setCapRate] = useState(0)
  const [annualCashFlow, setAnnualCashFlow] = useState(0)
  const [cashOnCashReturn, setCashOnCashReturn] = useState(0)
  const [totalCashInvested, setTotalCashInvested] = useState(0)

  const [activeTooltip, setActiveTooltip] = useState(null)
  const tooltipTimeoutRef = useRef(null)

  useEffect(() => {
    calculateResults()
  }, [loanType, monthlyRent, annualTaxes, annualInsurance, annualHOA,
      loanAmount, interestRate, termInYears, originationFee, loanFees,
      titleFees, escrow, prepaidInterest, prepaidInsurance, paymentReserve,
      purchasePrice, loanPurpose, currentLoanBalance, cashOutEnabled, cashOutAmount,
      vacancyRate, propertyManagementFee])

  useEffect(() => {
    if (purchasePrice > 0) {
      setLtv(parseFloat(((loanAmount / purchasePrice) * 100).toFixed(2)))
    }
  }, [loanAmount, purchasePrice])

  useEffect(() => {
    if (originationFeeMode === 'percentage' && loanAmount > 0) {
      setOriginationFee(parseFloat(((loanAmount * originationFeePercent) / 100).toFixed(0)))
    }
  }, [originationFeeMode, originationFeePercent, loanAmount])

  const calculateResults = () => {
    const rate = (interestRate / 100) / 12
    const numPayments = termInYears * 12
    let payment = 0
    if (loanType === 'interestOnly') {
      payment = (loanAmount * (interestRate / 100)) / 12
    } else {
      if (rate > 0 && numPayments > 0) {
        payment = (loanAmount * rate * Math.pow(1 + rate, numPayments)) / (Math.pow(1 + rate, numPayments) - 1)
      }
    }
    const monthlyTax = annualTaxes / 12
    const monthlyIns = annualInsurance / 12
    const monthlyHoa = annualHOA / 12
    const totalPITIA = payment + monthlyTax + monthlyIns + monthlyHoa
    const vacancyLoss = monthlyRent * (vacancyRate / 100)
    const effectiveRent = monthlyRent - vacancyLoss
    const managementFeeAmount = effectiveRent * (propertyManagementFee / 100)
    const netRentalIncome = effectiveRent - managementFeeAmount
    const dscrValue = totalPITIA > 0 ? netRentalIncome / totalPITIA : 0
    const cashflow = netRentalIncome - totalPITIA
    const annualNetRentalIncome = netRentalIncome * 12
    const annualOperatingExpenses = (monthlyTax + monthlyIns + monthlyHoa) * 12
    const noiValue = annualNetRentalIncome - annualOperatingExpenses
    const annualCashFlowValue = cashflow * 12
    const capRateValue = purchasePrice > 0 ? (noiValue / purchasePrice) * 100 : 0
    const fees = originationFee + loanFees + titleFees + escrow + prepaidInterest + prepaidInsurance + paymentReserve
    let downPmt = 0, netProceeds = 0, liquidity = 0, cashInvested = 0
    if (loanPurpose === 'purchase') {
      downPmt = purchasePrice - loanAmount
      netProceeds = loanAmount - fees
      liquidity = downPmt + originationFee + loanFees + (totalPITIA * 9)
      cashInvested = downPmt + fees
    } else {
      netProceeds = loanAmount - fees
      if (cashOutEnabled) netProceeds = loanAmount - currentLoanBalance - fees
      liquidity = fees + (totalPITIA * 6)
      cashInvested = fees
    }
    const cashOnCashValue = cashInvested > 0 ? (annualCashFlowValue / cashInvested) * 100 : 0
    setMonthlyPayment(payment)
    setDscr(dscrValue)
    setMonthlyCashflow(cashflow)
    setProceeds(netProceeds)
    setLiquidityToVerify(liquidity)
    setEffectiveMonthlyRent(netRentalIncome)
    setNoi(noiValue)
    setCapRate(capRateValue)
    setAnnualCashFlow(annualCashFlowValue)
    setCashOnCashReturn(cashOnCashValue)
    setTotalCashInvested(cashInvested)
  }

  const handleLtvChange = (val) => {
    const newLtv = parseFloat(val) || 0
    setLtv(newLtv)
    setLoanAmount(parseFloat(((purchasePrice * newLtv) / 100).toFixed(0)))
  }

  const handleOriginationFeePercentChange = (val) => {
    const newPercent = parseFloat(val) || 0
    setOriginationFeePercent(newPercent)
    setOriginationFee(parseFloat(((loanAmount * newPercent) / 100).toFixed(0)))
  }

  const resetToDefaults = () => {
    setLoanType('amortizing'); setLoanPurpose('purchase'); setMonthlyRent(0)
    setAnnualTaxes(0); setAnnualInsurance(0); setAnnualHOA(0)
    setPurchasePrice(0); setLoanAmount(0); setLtv(0); setInterestRate(0)
    setTermInYears(0); setOriginationFee(0); setOriginationFeeMode('fixed')
    setOriginationFeePercent(0); setLoanFees(0); setTitleFees(0); setEscrow(0)
    setPrepaidInterest(0); setPrepaidInsurance(0); setPaymentReserve(0)
    setCurrentLoanBalance(0); setCashOutEnabled(false); setCashOutAmount(0)
    setVacancyRate(0); setPropertyManagementFee(0)
    setHasChanged(false); setInitialSnapshot(null)
  }

  const resetDifferences = () => {
    if (!initialSnapshot) return
    if (loanType !== initialSnapshot.loanType) setLoanType(initialSnapshot.loanType)
    if (loanPurpose !== initialSnapshot.loanPurpose) setLoanPurpose(initialSnapshot.loanPurpose)
    if (monthlyRent !== initialSnapshot.monthlyRent) setMonthlyRent(initialSnapshot.monthlyRent)
    if (annualTaxes !== initialSnapshot.annualTaxes) setAnnualTaxes(initialSnapshot.annualTaxes)
    if (annualInsurance !== initialSnapshot.annualInsurance) setAnnualInsurance(initialSnapshot.annualInsurance)
    if (annualHOA !== initialSnapshot.annualHOA) setAnnualHOA(initialSnapshot.annualHOA)
    if (purchasePrice !== initialSnapshot.purchasePrice) setPurchasePrice(initialSnapshot.purchasePrice)
    if (loanAmount !== initialSnapshot.loanAmount) setLoanAmount(initialSnapshot.loanAmount)
    if (ltv !== initialSnapshot.ltv) setLtv(initialSnapshot.ltv)
    if (interestRate !== initialSnapshot.interestRate) setInterestRate(initialSnapshot.interestRate)
    if (termInYears !== initialSnapshot.termInYears) setTermInYears(initialSnapshot.termInYears)
    if (originationFee !== initialSnapshot.originationFee) setOriginationFee(initialSnapshot.originationFee)
    if (originationFeeMode !== initialSnapshot.originationFeeMode) setOriginationFeeMode(initialSnapshot.originationFeeMode)
    if (originationFeePercent !== initialSnapshot.originationFeePercent) setOriginationFeePercent(initialSnapshot.originationFeePercent)
    if (loanFees !== initialSnapshot.loanFees) setLoanFees(initialSnapshot.loanFees)
    if (titleFees !== initialSnapshot.titleFees) setTitleFees(initialSnapshot.titleFees)
    if (escrow !== initialSnapshot.escrow) setEscrow(initialSnapshot.escrow)
    if (prepaidInterest !== initialSnapshot.prepaidInterest) setPrepaidInterest(initialSnapshot.prepaidInterest)
    if (prepaidInsurance !== initialSnapshot.prepaidInsurance) setPrepaidInsurance(initialSnapshot.prepaidInsurance)
    if (paymentReserve !== initialSnapshot.paymentReserve) setPaymentReserve(initialSnapshot.paymentReserve)
    if (currentLoanBalance !== initialSnapshot.currentLoanBalance) setCurrentLoanBalance(initialSnapshot.currentLoanBalance)
    if (cashOutEnabled !== initialSnapshot.cashOutEnabled) setCashOutEnabled(initialSnapshot.cashOutEnabled)
    if (cashOutAmount !== initialSnapshot.cashOutAmount) setCashOutAmount(initialSnapshot.cashOutAmount)
    if (vacancyRate !== initialSnapshot.vacancyRate) setVacancyRate(initialSnapshot.vacancyRate)
    if (propertyManagementFee !== initialSnapshot.propertyManagementFee) setPropertyManagementFee(initialSnapshot.propertyManagementFee)
  }

  const captureSnapshot = () => {
    if (!hasChanged) {
      setInitialSnapshot({
        loanType, loanPurpose, monthlyRent, annualTaxes, annualInsurance, annualHOA,
        purchasePrice, loanAmount, ltv, interestRate, termInYears,
        originationFee, originationFeeMode, originationFeePercent, loanFees, titleFees, escrow,
        prepaidInterest, prepaidInsurance, paymentReserve, currentLoanBalance, cashOutEnabled,
        cashOutAmount, vacancyRate, propertyManagementFee
      })
      setHasChanged(true)
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
  const formatDecimal = (val, decimals = 2) => Number(val).toFixed(decimals)

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      // Header
      doc.setFillColor(208, 56, 57)
      doc.rect(0, 0, 210, 40, 'F')
      try {
        const img = new Image()
        img.src = '/assets/logo.svg'
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; setTimeout(reject, 3000) })
        doc.addImage(img, 'SVG', 75, 10, 60, 20)
      } catch {
        doc.setFontSize(24); doc.setTextColor(255, 255, 255)
        doc.text('DEELMAP', 105, 25, { align: 'center' })
      }
      doc.setFontSize(22); doc.setTextColor(26, 24, 22)
      doc.text('DSCR Calculator Report', 105, 55, { align: 'center' })
      doc.setDrawColor(232, 232, 228); doc.setLineWidth(0.5); doc.line(20, 62, 190, 62)
      let y = 75
      doc.setFillColor(250, 250, 248)
      doc.roundedRect(20, y, 170, 45, 3, 3, 'F')
      doc.setFontSize(14); doc.setTextColor(26, 24, 22)
      doc.text('Debt Service Coverage Ratio', 105, y + 10, { align: 'center' })
      doc.setFontSize(32)
      const dscrColor = dscr >= 1.1 ? [16, 185, 129] : [220, 38, 38]
      doc.setTextColor(dscrColor[0], dscrColor[1], dscrColor[2])
      doc.text(formatDecimal(dscr, 2), 105, y + 28, { align: 'center' })
      doc.setFontSize(10); doc.setTextColor(115, 115, 112)
      doc.text(dscr >= 1.1 ? 'Positive Coverage - Loan Qualifies' : 'Insufficient Coverage', 105, y + 38, { align: 'center' })
      y += 55
      doc.setFontSize(14); doc.setTextColor(26, 24, 22)
      doc.text('Key Financial Metrics', 20, y); y += 10
      const totalPITIA = monthlyPayment + (annualTaxes / 12) + (annualInsurance / 12) + (annualHOA / 12)
      const metrics = [
        { label: 'Monthly Rental Income', value: formatCurrency(monthlyRent) },
        { label: 'Effective Monthly Rent', value: formatCurrency(effectiveMonthlyRent) },
        { label: 'Monthly Payment (PITIA)', value: formatCurrency(totalPITIA) },
        { label: 'Monthly Cashflow', value: formatCurrency(monthlyCashflow), color: monthlyCashflow >= 0 ? 'green' : 'red' },
        { label: 'Annual Cash Flow', value: formatCurrency(annualCashFlow), color: annualCashFlow >= 0 ? 'green' : 'red' },
        { label: 'Net Operating Income (NOI)', value: formatCurrency(noi) },
        { label: 'Cap Rate', value: formatDecimal(capRate, 2) + '%' },
        { label: 'Cash-on-Cash Return', value: formatDecimal(cashOnCashReturn, 2) + '%', color: cashOnCashReturn >= 0 ? 'green' : 'red' },
        { label: 'Loan Proceeds', value: formatCurrency(proceeds) },
        { label: 'Liquidity Required', value: formatCurrency(liquidityToVerify) }
      ]
      metrics.forEach((m, idx) => {
        const rowY = y + (idx * 12)
        if (idx % 2 === 0) { doc.setFillColor(250, 250, 248); doc.rect(20, rowY - 3, 170, 10, 'F') }
        doc.setFontSize(10); doc.setTextColor(115, 115, 112); doc.text(m.label, 25, rowY + 4)
        doc.setFontSize(11)
        if (m.color === 'green') doc.setTextColor(16, 185, 129)
        else if (m.color === 'red') doc.setTextColor(220, 38, 38)
        else doc.setTextColor(26, 24, 22)
        doc.setFont(undefined, 'bold'); doc.text(m.value, 185, rowY + 4, { align: 'right' }); doc.setFont(undefined, 'normal')
      })
      y += (metrics.length * 12) + 10
      doc.setFontSize(14); doc.setTextColor(26, 24, 22); doc.text('Loan Details', 20, y); y += 10
      let details = [
        { label: 'Loan Type', value: loanType === 'amortizing' ? 'Fully Amortizing' : 'Interest Only' },
        { label: 'Loan Purpose', value: loanPurpose === 'purchase' ? 'Purchase' : 'Refinance' },
        { label: 'Property Value', value: formatCurrency(purchasePrice) },
        { label: 'Loan Amount', value: formatCurrency(loanAmount) },
        { label: 'LTV', value: formatDecimal(ltv, 2) + '%' },
        { label: 'Interest Rate', value: formatDecimal(interestRate, 2) + '%' },
        { label: 'Term', value: termInYears + ' years' },
        { label: 'Vacancy Rate', value: formatDecimal(vacancyRate, 1) + '%' },
        { label: 'Management Fee', value: formatDecimal(propertyManagementFee, 1) + '%' }
      ]
      if (loanPurpose === 'refinance') {
        details.push({ label: 'Current Balance', value: formatCurrency(currentLoanBalance) })
        if (cashOutEnabled) details.push({ label: 'Cash-Out', value: formatCurrency(cashOutAmount) })
      }
      let detailY = y
      details.forEach((d, idx) => {
        const col = idx % 2 === 0 ? 25 : 110
        if (idx % 2 === 0 && idx > 0) detailY += 8
        doc.setFontSize(9); doc.setTextColor(115, 115, 112); doc.text(d.label, col, detailY)
        doc.setFontSize(10); doc.setTextColor(26, 24, 22); doc.setFont(undefined, 'bold')
        doc.text(d.value, col, detailY + 5); doc.setFont(undefined, 'normal')
      })
      doc.setFillColor(232, 232, 228); doc.rect(0, 275, 210, 22, 'F')
      doc.setFontSize(9); doc.setTextColor(115, 115, 112)
      doc.text('Generated by DeelMap | Wholesale Real Estate Deals', 105, 283, { align: 'center' })
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' })
      doc.save(`DSCR-Report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF Error:', err)
      alert('Could not generate PDF. Please try again.')
    }
  }

  const showTooltip = (id) => { if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current); setActiveTooltip(id) }
  const hideTooltip = () => { tooltipTimeoutRef.current = setTimeout(() => setActiveTooltip(null), 100) }

  const tooltips = {
    loanType: "Choose between fully amortizing (principal + interest) or interest-only payments.",
    monthlyRent: "Expected monthly rental income for the property.",
    annualTaxes: "Actual or estimated annual property taxes.",
    annualInsurance: "Annual property insurance cost.",
    annualHOA: "Annual homeowners association dues, if applicable.",
    loanPurpose: "Purchase or refinance - affects which fields appear.",
    purchasePrice: "For Purchase: ARV (After Repair Value) or purchase price. For Refinance: Current appraised value of the property.",
    loanAmount: "Total loan size.",
    ltv: "Loan-to-Value ratio (typically 50-80%).",
    interestRate: "Annual interest rate.",
    termInYears: "Loan term in years (15 or 30 typically).",
    originationFee: "Lender's processing fee (≈ $1,500).",
    loanFees: "Third-party underwriting and appraisal (≈ $1,995).",
    titleFees: "Title company charges (~1% of loan).",
    escrow: "Funds held by lender for taxes/insurance.",
    prepaidInterest: "Daily interest from closing to month end.",
    prepaidInsurance: "First year insurance paid upfront.",
    paymentReserve: "0-3 months payments held in reserve.",
    currentLoanBalance: "Existing mortgage balance being refinanced.",
    cashOutEnabled: "Are you taking cash out in this refinance?",
    cashOutAmount: "Amount of cash you want to receive at closing.",
    vacancyRate: "Expected vacancy rate (typically 5-8%). Reduces effective rental income.",
    propertyManagementFee: "Property management fee as % of rent (typically 8-10%).",
    monthlyPayment: "Total monthly payment (PITIA).",
    dscr: "Debt Service Coverage Ratio. >1.1 means positive coverage. Calculated using effective rent after vacancy and management fees.",
    monthlyCashflow: "Monthly profit or loss (Effective Rent - PITIA).",
    proceeds: "Net loan funds after fees. For cash-out refi: cash to borrower after paying off existing loan.",
    liquidityToVerify: "Total funds lender will verify.",
    effectiveMonthlyRent: "Rental income after vacancy loss and management fees.",
    noi: "Net Operating Income. Annual rental income minus operating expenses.",
    capRate: "Capitalization Rate. Measures return on investment (NOI / Property Value).",
    annualCashFlow: "Total annual cash flow (Monthly Cashflow × 12).",
    cashOnCashReturn: "Annual return on your actual cash invested (Annual Cash Flow / Cash Invested)."
  }

  const inputClass = "w-full px-4 py-2.5 border border-[#E8E8E4] rounded text-sm text-[#1A1816] bg-white placeholder-[#A8A8A4] focus:outline-none focus:ring-2 focus:ring-[#D03839]/20 focus:border-[#D03839] transition-colors"
  const labelClass = "flex items-center text-sm font-medium text-[#1A1816] mb-2"
  const tooltipClass = "absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#1A1816] text-white text-xs rounded shadow-xl z-[9999] pointer-events-none"

  const TooltipField = ({ id, children }) => (
    <div className="relative inline-block ml-1.5">
      <div onMouseEnter={() => showTooltip(id)} onMouseLeave={hideTooltip} className="text-[#A8A8A4] hover:text-[#D03839] cursor-help transition-colors">
        <Info className="w-3.5 h-3.5" />
      </div>
      {activeTooltip === id && (
        <div className={tooltipClass}>
          {tooltips[id]}
          <div className="absolute top-full left-4 w-2 h-2 bg-[#1A1816] transform -translate-y-1 rotate-45" />
        </div>
      )}
    </div>
  )

  const ToggleGroup = ({ value, onChange, options }) => (
    <div className="flex gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 px-4 py-2.5 rounded text-sm font-medium transition-all ${value === opt.value ? 'bg-[#D03839] text-white' : 'bg-[#FAFAF8] border border-[#E8E8E4] text-[#737370] hover:text-[#1A1816] hover:border-[#A8A8A4]'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  )

  const totalPITIA = monthlyPayment + (annualTaxes / 12) + (annualInsurance / 12) + (annualHOA / 12)

  return (
    <div className="min-h-screen bg-[#FAFAF8] relative">
      <RegistrationModal
        isOpen={showLoginModal}
        onClose={() => {}}
        initialStep="login"
        preventClose={true}
        backUrl="/resources"
      />
      <Navbar />
      <div className={`pt-[80px] ${showLoginModal ? 'blur-sm pointer-events-none select-none' : ''}`}>

        {/* Page Header */}
        <div className="border-b border-[#E8E8E4] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1816]">DSCR Calculator</h1>
            <p className="text-sm text-[#737370] mt-1">Calculate your Debt Service Coverage Ratio for investment properties</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button type="button" onClick={resetToDefaults}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E8E4] text-[#737370] rounded text-sm font-medium hover:border-[#A8A8A4] hover:text-[#1A1816] transition-colors">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            {hasChanged && (
              <button type="button" onClick={resetDifferences}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E8E4] text-[#737370] rounded text-sm font-medium hover:border-[#A8A8A4] hover:text-[#1A1816] transition-colors">
                <RotateCcw className="w-4 h-4" />
                Reset Changes
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* LEFT — Inputs */}
            <div className="bg-white rounded border border-[#E8E8E4] p-6">
              <h2 className="text-base font-semibold text-[#1A1816] mb-5">Input Parameters</h2>

              {/* Loan Amortization */}
              <div className="mb-4">
                <label className={labelClass}>Loan Amortization<TooltipField id="loanType" /></label>
                <ToggleGroup value={loanType} onChange={(v) => { setLoanType(v); captureSnapshot() }}
                  options={[{ value: 'amortizing', label: 'Fully Amortizing' }, { value: 'interestOnly', label: 'Interest Only' }]} />
              </div>

              {/* Loan Purpose */}
              <div className="mb-4">
                <label className={labelClass}>Loan Purpose<TooltipField id="loanPurpose" /></label>
                <ToggleGroup value={loanPurpose} onChange={(v) => { setLoanPurpose(v); captureSnapshot() }}
                  options={[{ value: 'purchase', label: 'Purchase' }, { value: 'refinance', label: 'Refinance' }]} />
              </div>

              {/* Monthly Rent */}
              <div className="mb-4">
                <label className={labelClass}>Monthly Rent<TooltipField id="monthlyRent" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={monthlyRent === 0 ? '' : monthlyRent}
                    onChange={(e) => { setMonthlyRent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Annual Taxes */}
              <div className="mb-4">
                <label className={labelClass}>Annual Taxes<TooltipField id="annualTaxes" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={annualTaxes === 0 ? '' : annualTaxes}
                    onChange={(e) => { setAnnualTaxes(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Annual Insurance */}
              <div className="mb-4">
                <label className={labelClass}>Annual Insurance<TooltipField id="annualInsurance" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={annualInsurance === 0 ? '' : annualInsurance}
                    onChange={(e) => { setAnnualInsurance(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Annual HOA */}
              <div className="mb-4">
                <label className={labelClass}>Annual HOA<TooltipField id="annualHOA" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={annualHOA === 0 ? '' : annualHOA}
                    onChange={(e) => { setAnnualHOA(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Vacancy Rate */}
              <div className="mb-4">
                <label className={labelClass}>Vacancy Rate<TooltipField id="vacancyRate" /></label>
                <div className="relative">
                  <input type="text" value={vacancyRate === 0 ? '' : vacancyRate}
                    onChange={(e) => { const v = e.target.value; if (v === '' || v === '.' || !isNaN(v)) { setVacancyRate(v === '' ? 0 : v); captureSnapshot() } }}
                    onBlur={(e) => setVacancyRate(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pr-8'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">%</span>
                </div>
              </div>

              {/* Property Management Fee */}
              <div className="mb-4">
                <label className={labelClass}>Property Management Fee<TooltipField id="propertyManagementFee" /></label>
                <div className="relative">
                  <input type="text" value={propertyManagementFee === 0 ? '' : propertyManagementFee}
                    onChange={(e) => { const v = e.target.value; if (v === '' || v === '.' || !isNaN(v)) { setPropertyManagementFee(v === '' ? 0 : v); captureSnapshot() } }}
                    onBlur={(e) => setPropertyManagementFee(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pr-8'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">%</span>
                </div>
              </div>

              {/* Property Value */}
              <div className="mb-4">
                <label className={labelClass}>
                  {loanPurpose === 'purchase' ? 'Purchase Price (ARV or Appraised Value)' : 'Current Property Value (Appraised Value)'}
                  <TooltipField id="purchasePrice" />
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={purchasePrice === 0 ? '' : purchasePrice}
                    onChange={(e) => { setPurchasePrice(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Refinance-specific fields */}
              {loanPurpose === 'refinance' && (
                <>
                  <div className="mb-4">
                    <label className={labelClass}>Current Loan Balance<TooltipField id="currentLoanBalance" /></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                      <input type="text" value={currentLoanBalance === 0 ? '' : currentLoanBalance}
                        onChange={(e) => { setCurrentLoanBalance(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                        onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className={labelClass}>Taking Cash Out?<TooltipField id="cashOutEnabled" /></label>
                    <ToggleGroup value={cashOutEnabled ? 'yes' : 'no'} onChange={(v) => { setCashOutEnabled(v === 'yes'); captureSnapshot() }}
                      options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} />
                  </div>
                  {cashOutEnabled && (
                    <div className="mb-4">
                      <label className={labelClass}>Desired Cash-Out Amount<TooltipField id="cashOutAmount" /></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                        <input type="text" value={cashOutAmount === 0 ? '' : cashOutAmount}
                          onChange={(e) => { setCashOutAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                          onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Loan Amount */}
              <div className="mb-4">
                <label className={labelClass}>Loan Amount<TooltipField id="loanAmount" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={loanAmount === 0 ? '' : loanAmount}
                    onChange={(e) => { setLoanAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* LTV */}
              <div className="mb-4">
                <label className={labelClass}>Loan-to-Value (LTV)<TooltipField id="ltv" /></label>
                <div className="relative">
                  <input type="text" value={ltv === 0 ? '' : ltv}
                    onChange={(e) => { handleLtvChange(e.target.value); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pr-8'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">%</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="mb-4">
                <label className={labelClass}>Interest Rate<TooltipField id="interestRate" /></label>
                <div className="relative">
                  <input type="text" value={interestRate === 0 ? '' : interestRate}
                    onChange={(e) => { const v = e.target.value; if (v === '' || v === '.' || !isNaN(v)) { setInterestRate(v === '' ? 0 : v); captureSnapshot() } }}
                    onBlur={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pr-8'} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">%</span>
                </div>
              </div>

              {/* Loan Term */}
              <div className="mb-4">
                <label className={labelClass}>Loan Term (Years)<TooltipField id="termInYears" /></label>
                <input type="text" value={termInYears === 0 ? '' : termInYears}
                  onChange={(e) => { setTermInYears(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                  onFocus={(e) => e.target.select()} className={inputClass} />
              </div>

              {/* Origination Fee */}
              <div className="mb-4">
                <label className={labelClass}>Origination Fee<TooltipField id="originationFee" /></label>
                <div className="flex gap-2 mb-2">
                  {['fixed', 'percentage'].map(mode => (
                    <button key={mode} type="button" onClick={() => { setOriginationFeeMode(mode); captureSnapshot() }}
                      className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${originationFeeMode === mode ? 'bg-[#D03839] text-white' : 'bg-[#FAFAF8] border border-[#E8E8E4] text-[#737370] hover:text-[#1A1816]'}`}>
                      {mode === 'fixed' ? 'Fixed Amount' : 'Percentage'}
                    </button>
                  ))}
                </div>
                {originationFeeMode === 'fixed' ? (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                    <input type="text" value={originationFee === 0 ? '' : originationFee}
                      onChange={(e) => { setOriginationFee(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                      onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <input type="text" value={originationFeePercent === 0 ? '' : originationFeePercent}
                        onChange={(e) => { const v = e.target.value; if (v === '' || v === '.' || !isNaN(v)) { handleOriginationFeePercentChange(v === '' ? 0 : v); captureSnapshot() } }}
                        onBlur={(e) => handleOriginationFeePercentChange(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()} className={inputClass + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">%</span>
                    </div>
                    <p className="text-xs text-[#737370] bg-[#FAFAF8] border border-[#E8E8E4] px-3 py-2 rounded">
                      Calculated Fee: <span className="font-semibold text-[#1A1816]">{formatCurrency(originationFee)}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Loan Fees */}
              <div className="mb-4">
                <label className={labelClass}>Loan Fees<TooltipField id="loanFees" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={loanFees === 0 ? '' : loanFees}
                    onChange={(e) => { setLoanFees(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Title Fees */}
              <div className="mb-4">
                <label className={labelClass}>Title Fees<TooltipField id="titleFees" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={titleFees === 0 ? '' : titleFees}
                    onChange={(e) => { setTitleFees(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Escrow */}
              <div className="mb-4">
                <label className={labelClass}>Escrow<TooltipField id="escrow" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={escrow === 0 ? '' : escrow}
                    onChange={(e) => { setEscrow(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Prepaid Interest */}
              <div className="mb-4">
                <label className={labelClass}>Prepaid Interest<TooltipField id="prepaidInterest" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={prepaidInterest === 0 ? '' : prepaidInterest}
                    onChange={(e) => { setPrepaidInterest(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Prepaid Insurance */}
              <div className="mb-4">
                <label className={labelClass}>Prepaid Insurance<TooltipField id="prepaidInsurance" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={prepaidInsurance === 0 ? '' : prepaidInsurance}
                    onChange={(e) => { setPrepaidInsurance(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>

              {/* Payment Reserve */}
              <div className="mb-0">
                <label className={labelClass}>Payment Reserve<TooltipField id="paymentReserve" /></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737370] text-sm pointer-events-none">$</span>
                  <input type="text" value={paymentReserve === 0 ? '' : paymentReserve}
                    onChange={(e) => { setPaymentReserve(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot() }}
                    onFocus={(e) => e.target.select()} className={inputClass + ' pl-7'} />
                </div>
              </div>
            </div>

            {/* RIGHT — Results */}
            <div className="lg:sticky lg:top-[96px] h-fit">
              <div className="bg-white rounded border border-[#E8E8E4] p-6">
                <h2 className="text-base font-semibold text-[#1A1816] mb-5">Results</h2>

                {/* DSCR Hero */}
                <div className={`rounded border p-5 mb-5 text-center ${dscr >= 1.1 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-medium text-[#737370] uppercase tracking-wide mb-1">Debt Service Coverage Ratio</p>
                  <p className={`text-5xl font-bold mb-1 ${dscr >= 1.1 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatDecimal(dscr, 2)}
                  </p>
                  <p className={`text-xs font-medium ${dscr >= 1.1 ? 'text-green-600' : 'text-red-600'}`}>
                    {dscr >= 1.1 ? 'Positive Coverage — Loan Qualifies' : 'Insufficient Coverage'}
                  </p>
                </div>

                {/* Metric rows */}
                {[
                  {
                    label: 'Monthly Payment (PITIA)', tooltipId: 'monthlyPayment',
                    value: formatCurrency(totalPITIA), sub: null
                  },
                  {
                    label: 'Monthly Cashflow', tooltipId: 'monthlyCashflow',
                    value: formatCurrency(monthlyCashflow),
                    color: monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'
                  },
                  {
                    label: 'Effective Monthly Rent', tooltipId: 'effectiveMonthlyRent',
                    value: formatCurrency(effectiveMonthlyRent),
                    sub: `After ${formatDecimal(vacancyRate, 1)}% vacancy & ${formatDecimal(propertyManagementFee, 1)}% mgmt`
                  },
                  {
                    label: 'Loan Proceeds', tooltipId: 'proceeds',
                    value: formatCurrency(proceeds)
                  },
                  {
                    label: 'Liquidity to Verify', tooltipId: 'liquidityToVerify',
                    value: formatCurrency(liquidityToVerify)
                  },
                  {
                    label: 'NOI (Annual)', tooltipId: 'noi',
                    value: formatCurrency(noi)
                  },
                  {
                    label: 'Cap Rate', tooltipId: 'capRate',
                    value: formatDecimal(capRate, 2) + '%'
                  },
                  {
                    label: 'Annual Cash Flow', tooltipId: 'annualCashFlow',
                    value: formatCurrency(annualCashFlow),
                    color: annualCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                  },
                  {
                    label: 'Cash-on-Cash Return', tooltipId: 'cashOnCashReturn',
                    value: formatDecimal(cashOnCashReturn, 2) + '%',
                    color: cashOnCashReturn >= 0 ? 'text-green-600' : 'text-red-600',
                    sub: `Cash Invested: ${formatCurrency(totalCashInvested)}`
                  },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[#E8E8E4] last:border-b-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-[#737370]">{m.label}</span>
                      <TooltipField id={m.tooltipId} />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${m.color || 'text-[#1A1816]'}`}>{m.value}</p>
                      {m.sub && <p className="text-[11px] text-[#A8A8A4] mt-0.5">{m.sub}</p>}
                    </div>
                  </div>
                ))}

                {/* Download PDF */}
                <div className="mt-5">
                  <button type="button" onClick={downloadPDF}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded bg-[#D03839] text-white text-sm font-semibold hover:bg-[#E0493B] active:bg-[#C73022] transition-colors">
                    <Download className="w-4 h-4" />
                    Download PDF Report
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
