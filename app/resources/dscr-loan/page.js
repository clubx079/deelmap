'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ArrowLeft, Info, Download, RotateCcw } from 'lucide-react'

export default function DSCRLoanPage() {
  // Input states - initialized with actual values
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
  const [loanFees, setLoanFees] = useState(1995)
  const [titleFees, setTitleFees] = useState(2400)
  const [escrow, setEscrow] = useState(0)
  const [prepaidInterest, setPrepaidInterest] = useState(0)
  const [prepaidInsurance, setPrepaidInsurance] = useState(0)
  const [paymentReserve, setPaymentReserve] = useState(0)

  // Store snapshot of values when user first changes something
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [hasChanged, setHasChanged] = useState(false)

  // Output states
  const [monthlyPayment, setMonthlyPayment] = useState(0)
  const [dscr, setDscr] = useState(0)
  const [monthlyCashflow, setMonthlyCashflow] = useState(0)
  const [proceeds, setProceeds] = useState(0)
  const [liquidityToVerify, setLiquidityToVerify] = useState(0)

  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState(null)
  const tooltipTimeoutRef = useRef(null)

  // Calculate on mount and when inputs change
  useEffect(() => {
    calculateResults()
  }, [loanType, monthlyRent, annualTaxes, annualInsurance, annualHOA,
      loanAmount, interestRate, termInYears, originationFee, loanFees,
      titleFees, escrow, prepaidInterest, prepaidInsurance, paymentReserve,
      purchasePrice, loanPurpose])

  // Auto-update LTV when loan amount or purchase price changes
  useEffect(() => {
    if (purchasePrice > 0) {
      const calculatedLtv = (loanAmount / purchasePrice) * 100
      setLtv(parseFloat(calculatedLtv.toFixed(2)))
    }
  }, [loanAmount, purchasePrice])

  const calculateResults = () => {
    const rate = (interestRate / 100) / 12
    const numPayments = termInYears * 12

    let payment = 0
    if (loanType === 'interestOnly') {
      payment = (loanAmount * (interestRate / 100)) / 12
    } else {
      if (rate > 0 && numPayments > 0) {
        payment = (loanAmount * rate * Math.pow(1 + rate, numPayments)) /
          (Math.pow(1 + rate, numPayments) - 1)
      }
    }

    const monthlyTax = annualTaxes / 12
    const monthlyIns = annualInsurance / 12
    const monthlyHoa = annualHOA / 12
    const totalPITIA = payment + monthlyTax + monthlyIns + monthlyHoa

    const dscrValue = totalPITIA > 0 ? monthlyRent / totalPITIA : 0
    const cashflow = monthlyRent - totalPITIA

    const fees = originationFee + loanFees + titleFees + escrow +
      prepaidInterest + prepaidInsurance + paymentReserve
    const netProceeds = loanAmount - fees

    const downPmt = purchasePrice - loanAmount
    const liquidity = downPmt + originationFee + loanFees + (totalPITIA * 9)

    setMonthlyPayment(payment)
    setDscr(dscrValue)
    setMonthlyCashflow(cashflow)
    setProceeds(netProceeds)
    setLiquidityToVerify(liquidity)
  }

  const handleLtvChange = (val) => {
    const newLtv = parseFloat(val) || 0
    setLtv(newLtv)
    const newLoan = (purchasePrice * newLtv) / 100
    setLoanAmount(parseFloat(newLoan.toFixed(0)))
  }

  const resetToDefaults = () => {
    // Clear all inputs to 0
    setLoanType('amortizing')
    setLoanPurpose('purchase')
    setMonthlyRent(0)
    setAnnualTaxes(0)
    setAnnualInsurance(0)
    setAnnualHOA(0)
    setPurchasePrice(0)
    setLoanAmount(0)
    setLtv(0)
    setInterestRate(0)
    setTermInYears(0)
    setOriginationFee(0)
    setLoanFees(0)
    setTitleFees(0)
    setEscrow(0)
    setPrepaidInterest(0)
    setPrepaidInsurance(0)
    setPaymentReserve(0)
    setHasChanged(false)
    setInitialSnapshot(null)
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
    if (loanFees !== initialSnapshot.loanFees) setLoanFees(initialSnapshot.loanFees)
    if (titleFees !== initialSnapshot.titleFees) setTitleFees(initialSnapshot.titleFees)
    if (escrow !== initialSnapshot.escrow) setEscrow(initialSnapshot.escrow)
    if (prepaidInterest !== initialSnapshot.prepaidInterest) setPrepaidInterest(initialSnapshot.prepaidInterest)
    if (prepaidInsurance !== initialSnapshot.prepaidInsurance) setPrepaidInsurance(initialSnapshot.prepaidInsurance)
    if (paymentReserve !== initialSnapshot.paymentReserve) setPaymentReserve(initialSnapshot.paymentReserve)
  }

  const captureSnapshot = () => {
    if (!hasChanged) {
      setInitialSnapshot({
        loanType, loanPurpose, monthlyRent, annualTaxes, annualInsurance, annualHOA,
        purchasePrice, loanAmount, ltv, interestRate, termInYears,
        originationFee, loanFees, titleFees, escrow,
        prepaidInterest, prepaidInsurance, paymentReserve
      })
      setHasChanged(true)
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const formatDecimal = (val, decimals = 2) => {
    return Number(val).toFixed(decimals)
  }

  const downloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Header with theme color
      doc.setFillColor(2, 43, 65)
      doc.rect(0, 0, 210, 40, 'F')

      // Logo
      try {
        const img = new Image()
        img.src = '/assets/ablemanlogo.png'
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          setTimeout(reject, 3000)
        })
        doc.addImage(img, 'PNG', 80, 12, 50, 16)
      } catch (e) {
        doc.setFontSize(24)
        doc.setTextColor(255, 255, 255)
        doc.text('ABLEMAN', 105, 25, { align: 'center' })
      }

      // Title
      doc.setFontSize(22)
      doc.setTextColor(2, 43, 65)
      doc.text('DSCR Calculator Report', 105, 55, { align: 'center' })

      // Accent line
      doc.setDrawColor(178, 149, 120)
      doc.setLineWidth(0.5)
      doc.line(20, 62, 190, 62)

      let y = 75

      // DSCR Summary Box
      doc.setFillColor(246, 244, 241)
      doc.roundedRect(20, y, 170, 45, 3, 3, 'F')

      doc.setFontSize(14)
      doc.setTextColor(2, 43, 65)
      doc.text('Debt Service Coverage Ratio', 105, y + 10, { align: 'center' })

      doc.setFontSize(32)
      const dscrColor = dscr >= 1.1 ? [16, 185, 129] : [220, 38, 38]
      doc.setTextColor(dscrColor[0], dscrColor[1], dscrColor[2])
      doc.text(formatDecimal(dscr, 2), 105, y + 25, { align: 'center' })

      doc.setFontSize(10)
      const statusText = dscr >= 1.1 ? '✓ Positive Coverage - Loan Qualifies' : '✗ Insufficient Coverage'
      doc.text(statusText, 105, y + 35, { align: 'center' })

      y += 55

      // Key Metrics
      doc.setFontSize(16)
      doc.setTextColor(2, 43, 65)
      doc.text('Key Financial Metrics', 20, y)
      y += 10

      const totalPITIA = monthlyPayment + (annualTaxes / 12) + (annualInsurance / 12) + (annualHOA / 12)

      const metrics = [
        { label: 'Monthly Rental Income', value: formatCurrency(monthlyRent) },
        { label: 'Monthly Payment (PITIA)', value: formatCurrency(totalPITIA) },
        { label: 'Monthly Cashflow', value: formatCurrency(monthlyCashflow), color: monthlyCashflow >= 0 ? 'green' : 'red' },
        { label: 'Loan Proceeds', value: formatCurrency(proceeds) },
        { label: 'Liquidity Required', value: formatCurrency(liquidityToVerify) }
      ]

      metrics.forEach((m, idx) => {
        const rowY = y + (idx * 12)
        if (idx % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(20, rowY - 3, 170, 10, 'F')
        }
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        doc.text(m.label, 25, rowY + 4)
        doc.setFontSize(11)
        if (m.color === 'green') {
          doc.setTextColor(16, 185, 129)
        } else if (m.color === 'red') {
          doc.setTextColor(220, 38, 38)
        } else {
          doc.setTextColor(2, 43, 65)
        }
        doc.setFont(undefined, 'bold')
        doc.text(m.value, 185, rowY + 4, { align: 'right' })
        doc.setFont(undefined, 'normal')
      })

      y += (metrics.length * 12) + 10

      // Loan Details
      doc.setFontSize(16)
      doc.setTextColor(2, 43, 65)
      doc.text('Loan Details', 20, y)
      y += 10

      const details = [
        { label: 'Loan Type', value: loanType === 'amortizing' ? 'Fully Amortizing' : 'Interest Only' },
        { label: 'Loan Purpose', value: loanPurpose === 'purchase' ? 'Purchase' : 'Refinance' },
        { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
        { label: 'Loan Amount', value: formatCurrency(loanAmount) },
        { label: 'LTV', value: formatDecimal(ltv, 2) + '%' },
        { label: 'Interest Rate', value: formatDecimal(interestRate, 2) + '%' },
        { label: 'Term', value: termInYears + ' years' }
      ]

      let detailY = y
      details.forEach((d, idx) => {
        const col = idx % 2 === 0 ? 25 : 110
        if (idx % 2 === 0 && idx > 0) detailY += 8

        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(d.label, col, detailY)

        doc.setFontSize(10)
        doc.setTextColor(2, 43, 65)
        doc.setFont(undefined, 'bold')
        doc.text(d.value, col, detailY + 5)
        doc.setFont(undefined, 'normal')
      })

      // Footer
      doc.setFillColor(178, 149, 120)
      doc.rect(0, 275, 210, 22, 'F')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text('Generated by Ableman | Investment Property Solutions', 105, 283, { align: 'center' })
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' })

      doc.save(`DSCR-Report-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF Error:', err)
      alert('Could not generate PDF. Please try again.')
    }
  }

  const showTooltip = (id) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current)
    setActiveTooltip(id)
  }

  const hideTooltip = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null)
    }, 100)
  }

  const tooltips = {
    loanType: "Choose between fully amortizing (principal + interest) or interest-only payments.",
    monthlyRent: "Expected monthly rental income for the property.",
    annualTaxes: "Actual or estimated annual property taxes.",
    annualInsurance: "Annual property insurance cost.",
    annualHOA: "Annual homeowners association dues, if applicable.",
    loanPurpose: "Purchase or refinance - affects which fields appear.",
    purchasePrice: "Property purchase price or appraised value.",
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
    monthlyPayment: "Total monthly payment (PITIA).",
    dscr: "Debt Service Coverage Ratio. >1.1 means positive coverage.",
    monthlyCashflow: "Monthly profit or loss (Rent - PITIA).",
    proceeds: "Net loan funds after fees.",
    liquidityToVerify: "Total funds lender will verify."
  }

  return (
    <div className="min-h-screen bg-[#F6F4F1]">
      <Navbar currentPage="resources" />

      <section className="py-4" style={{ backgroundColor: '#F6F4F1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-medium hover:text-[#b29578] transition-colors" style={{ color: '#022b41' }}>
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
        </div>
      </section>

      <section
        className="relative py-10 min-h-[30vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: 'url(/assets/aboutus.jpg)',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundColor: '#022b41'
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: '#022b41', opacity: 0.7 }} />
        <div className="relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
            style={{ animation: 'fadeInUp 1.5s ease-out', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            DSCR CALCULATOR
          </h1>
          <p className="text-lg text-white/90">
            Calculate your Debt Service Coverage Ratio for investment properties
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              type="button"
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-gray-50 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={resetDifferences}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all hover:bg-gray-50 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Diff
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* LEFT - INPUTS */}
            <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#022b41' }}>
                Input Parameters
              </h2>

              {/* Loan Type Toggle */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan Amortization
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('loanType')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'loanType' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.loanType}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setLoanType('amortizing'); captureSnapshot(); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${loanType === 'amortizing' ? 'bg-[#022b41] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Fully Amortizing
                  </button>
                  <button type="button" onClick={() => { setLoanType('interestOnly'); captureSnapshot(); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${loanType === 'interestOnly' ? 'bg-[#022b41] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Interest Only
                  </button>
                </div>
              </div>

              {/* Loan Purpose Toggle */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan Purpose
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('loanPurpose')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'loanPurpose' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.loanPurpose}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setLoanPurpose('purchase'); captureSnapshot(); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${loanPurpose === 'purchase' ? 'bg-[#022b41] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Purchase
                  </button>
                  <button type="button" onClick={() => { setLoanPurpose('refinance'); captureSnapshot(); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${loanPurpose === 'refinance' ? 'bg-[#022b41] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    Refinance
                  </button>
                </div>
              </div>

              {/* Monthly Rent */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('monthlyRent')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'monthlyRent' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.monthlyRent}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={monthlyRent === 0 ? '' : monthlyRent}
                    onChange={(e) => { setMonthlyRent(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Annual Taxes */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Annual Taxes
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('annualTaxes')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'annualTaxes' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.annualTaxes}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={annualTaxes === 0 ? '' : annualTaxes}
                    onChange={(e) => { setAnnualTaxes(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Annual Insurance */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Annual Insurance
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('annualInsurance')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'annualInsurance' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.annualInsurance}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={annualInsurance === 0 ? '' : annualInsurance}
                    onChange={(e) => { setAnnualInsurance(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Annual HOA */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Annual HOA
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('annualHOA')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'annualHOA' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.annualHOA}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={annualHOA === 0 ? '' : annualHOA}
                    onChange={(e) => { setAnnualHOA(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Purchase Price - conditional */}
              {loanPurpose === 'purchase' && (
                <div className="mb-4">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    Purchase Price
                    <div className="relative inline-block ml-2">
                      <div onMouseEnter={() => showTooltip('purchasePrice')} onMouseLeave={hideTooltip}
                        className="text-gray-400 hover:text-[#b29578] cursor-help">
                        <Info className="w-4 h-4" />
                      </div>
                      {activeTooltip === 'purchasePrice' && (
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                          {tooltips.purchasePrice}
                          <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                        </div>
                      )}
                    </div>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                    <input type="text" value={purchasePrice === 0 ? '' : purchasePrice}
                      onChange={(e) => { setPurchasePrice(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                  </div>
                </div>
              )}

              {/* Loan Amount */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan Amount
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('loanAmount')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'loanAmount' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.loanAmount}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={loanAmount === 0 ? '' : loanAmount}
                    onChange={(e) => { setLoanAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* LTV */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan-to-Value (LTV)
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('ltv')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'ltv' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.ltv}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <input type="text" value={ltv === 0 ? '' : ltv}
                    onChange={(e) => { handleLtvChange(e.target.value); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pr-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">%</span>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Interest Rate
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('interestRate')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'interestRate' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.interestRate}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <input type="text" value={interestRate === 0 ? '' : interestRate}
                    onChange={(e) => { setInterestRate(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pr-10 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">%</span>
                </div>
              </div>

              {/* Term */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan Term (Years)
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('termInYears')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'termInYears' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.termInYears}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <input type="text" value={termInYears === 0 ? '' : termInYears}
                  onChange={(e) => { setTermInYears(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
              </div>

              {/* Origination Fee */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Origination Fee
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('originationFee')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'originationFee' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.originationFee}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={originationFee === 0 ? '' : originationFee}
                    onChange={(e) => { setOriginationFee(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Loan Fees */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Loan Fees
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('loanFees')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'loanFees' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.loanFees}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={loanFees === 0 ? '' : loanFees}
                    onChange={(e) => { setLoanFees(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Title Fees */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Title Fees
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('titleFees')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'titleFees' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.titleFees}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={titleFees === 0 ? '' : titleFees}
                    onChange={(e) => { setTitleFees(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Escrow */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Escrow
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('escrow')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'escrow' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.escrow}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={escrow === 0 ? '' : escrow}
                    onChange={(e) => { setEscrow(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Prepaid Interest */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Prepaid Interest
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('prepaidInterest')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'prepaidInterest' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.prepaidInterest}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={prepaidInterest === 0 ? '' : prepaidInterest}
                    onChange={(e) => { setPrepaidInterest(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Prepaid Insurance */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Prepaid Insurance
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('prepaidInsurance')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'prepaidInsurance' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.prepaidInsurance}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={prepaidInsurance === 0 ? '' : prepaidInsurance}
                    onChange={(e) => { setPrepaidInsurance(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

              {/* Payment Reserve */}
              <div className="mb-4">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  Payment Reserve
                  <div className="relative inline-block ml-2">
                    <div onMouseEnter={() => showTooltip('paymentReserve')} onMouseLeave={hideTooltip}
                      className="text-gray-400 hover:text-[#b29578] cursor-help">
                      <Info className="w-4 h-4" />
                    </div>
                    {activeTooltip === 'paymentReserve' && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                        {tooltips.paymentReserve}
                        <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                      </div>
                    )}
                  </div>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">$</span>
                  <input type="text" value={paymentReserve === 0 ? '' : paymentReserve}
                    onChange={(e) => { setPaymentReserve(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0); captureSnapshot(); }}
                    onFocus={(e) => e.target.select()}
                    className="w-full pl-8 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#b29578] focus:border-transparent" />
                </div>
              </div>

            </div>

            {/* RIGHT - OUTPUTS */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 lg:sticky lg:top-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#022b41' }}>
                  Calculated Results
                </h2>

                <div className="space-y-6">

                  {/* Monthly Payment */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">Monthly Payment (PITIA)</span>
                      <div className="relative inline-block ml-2">
                        <div onMouseEnter={() => showTooltip('monthlyPayment')} onMouseLeave={hideTooltip}
                          className="text-gray-400 hover:text-[#b29578] cursor-help">
                          <Info className="w-4 h-4" />
                        </div>
                        {activeTooltip === 'monthlyPayment' && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                            {tooltips.monthlyPayment}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#022b41' }}>
                      {formatCurrency(monthlyPayment + (annualTaxes / 12) + (annualInsurance / 12) + (annualHOA / 12))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Principal & Interest: {formatCurrency(monthlyPayment)}
                    </div>
                  </div>

                  {/* DSCR */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">DSCR</span>
                      <div className="relative inline-block ml-2">
                        <div onMouseEnter={() => showTooltip('dscr')} onMouseLeave={hideTooltip}
                          className="text-gray-400 hover:text-[#b29578] cursor-help">
                          <Info className="w-4 h-4" />
                        </div>
                        {activeTooltip === 'dscr' && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                            {tooltips.dscr}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold mt-2" style={{ color: dscr >= 1.1 ? '#10b981' : '#dc2626' }}>
                      {formatDecimal(dscr, 2)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: dscr >= 1.1 ? '#10b981' : '#dc2626' }}>
                      {dscr >= 1.1 ? '✓ Positive Coverage' : '✗ Insufficient Coverage'}
                    </div>
                  </div>

                  {/* Monthly Cashflow */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">Monthly Cashflow</span>
                      <div className="relative inline-block ml-2">
                        <div onMouseEnter={() => showTooltip('monthlyCashflow')} onMouseLeave={hideTooltip}
                          className="text-gray-400 hover:text-[#b29578] cursor-help">
                          <Info className="w-4 h-4" />
                        </div>
                        {activeTooltip === 'monthlyCashflow' && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                            {tooltips.monthlyCashflow}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold mt-2" style={{ color: monthlyCashflow >= 0 ? '#10b981' : '#dc2626' }}>
                      {formatCurrency(monthlyCashflow)}
                    </div>
                  </div>

                  {/* Proceeds */}
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">Proceeds</span>
                      <div className="relative inline-block ml-2">
                        <div onMouseEnter={() => showTooltip('proceeds')} onMouseLeave={hideTooltip}
                          className="text-gray-400 hover:text-[#b29578] cursor-help">
                          <Info className="w-4 h-4" />
                        </div>
                        {activeTooltip === 'proceeds' && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                            {tooltips.proceeds}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#022b41' }}>
                      {formatCurrency(proceeds)}
                    </div>
                  </div>

                  {/* Liquidity */}
                  <div className="pb-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">Liquidity to Verify</span>
                      <div className="relative inline-block ml-2">
                        <div onMouseEnter={() => showTooltip('liquidityToVerify')} onMouseLeave={hideTooltip}
                          className="text-gray-400 hover:text-[#b29578] cursor-help">
                          <Info className="w-4 h-4" />
                        </div>
                        {activeTooltip === 'liquidityToVerify' && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none">
                            {tooltips.liquidityToVerify}
                            <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform -translate-y-1 rotate-45" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-3xl font-bold mt-2" style={{ color: '#022b41' }}>
                      {formatCurrency(liquidityToVerify)}
                    </div>
                  </div>

                </div>

                {/* Buttons */}
                <div className="mt-8">
                  <button type="button" onClick={downloadPDF}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
                    style={{ backgroundColor: '#022b41' }}>
                    <Download className="w-5 h-5" />
                    Download PDF Report
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
