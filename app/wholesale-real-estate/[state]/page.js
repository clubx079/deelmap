import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Search, BarChart2, MessageCircle, TrendingUp, Shield, Home, Building2 } from 'lucide-react'

const STATE_DATA = {
  tennessee: {
    name: 'Tennessee',
    abbr: 'TN',
    cities: 'Nashville, Memphis, Knoxville, and Chattanooga',
    description: 'Tennessee has become one of the most active real estate investment markets in the South. Nashville\'s rapid population growth and strong job market have driven demand for housing across all price points, creating consistent wholesale deal flow for investors who know where to look.',
    paragraph2: 'Memphis remains one of the top buy-and-hold markets in the country, with some of the highest rental yields available in any major US city. Investors who purchase wholesale deals in Memphis regularly achieve double-digit cash-on-cash returns, making it a favorite for out-of-state buyers building rental portfolios.',
    paragraph3: 'Knoxville and Chattanooga offer lower entry points with growing demand — both cities have seen significant migration from larger metros and have a healthy pipeline of distressed properties that make strong fix-and-flip candidates.',
    highlights: ['Strong rental demand in Memphis — consistently top-10 for cash flow nationwide', 'Nashville metro growing faster than supply — strong ARV appreciation', 'Low property taxes compared to national average', 'No state income tax attracts long-term residents and investors'],
    marketType: 'High-growth with strong rental fundamentals',
    avgEntry: '$80,000–$220,000',
  },
  florida: {
    name: 'Florida',
    abbr: 'FL',
    cities: 'Miami, Tampa, Orlando, and Jacksonville',
    description: 'Florida is one of the largest wholesale real estate markets in the United States. With year-round in-migration, a warm climate, and no state income tax, demand for residential properties remains high across nearly every price point and geography — from South Beach to the Panhandle.',
    paragraph2: 'Tampa and Orlando have seen explosive population growth over the past several years, driven by relocations from the Northeast and Midwest. This migration has pushed ARVs higher while keeping motivated seller deal flow steady in established neighborhoods with aging housing stock.',
    paragraph3: 'Jacksonville and Central Florida\'s secondary markets offer strong entry-level wholesale opportunities with lower competition than the coastal metros. Investors targeting buy-and-hold strategies find reliable tenant demand and manageable entry prices across these areas.',
    highlights: ['Year-round migration drives consistent housing demand', 'No state income tax — attractive to long-term investors', 'Strong vacation and short-term rental markets in coastal areas', 'Large inventory of aging single-family homes ripe for wholesale'],
    marketType: 'High-volume with diverse market segments',
    avgEntry: '$100,000–$300,000',
  },
  texas: {
    name: 'Texas',
    abbr: 'TX',
    cities: 'Dallas, Houston, San Antonio, and Austin',
    description: 'Texas consistently ranks among the top states for real estate investment activity. Its combination of population growth, business-friendly regulations, and a vast geographic spread of markets gives investors access to deals at nearly every price point and risk profile.',
    paragraph2: 'Dallas-Fort Worth is one of the largest wholesale markets in the country. The region\'s job growth, corporate relocations, and ongoing suburban expansion have created a strong demand for both fix-and-flip and buy-and-hold properties. Investors in DFW benefit from high volume deal flow and strong exit markets.',
    paragraph3: 'Houston\'s sheer size and diversity of neighborhoods gives investors a wide range of options, from entry-level rentals in the east side to high-ARV flips in the Inner Loop. San Antonio offers strong military and healthcare-driven rental demand with lower price points than Dallas or Austin.',
    highlights: ['One of the fastest-growing states by population', 'No state income tax for investors or tenants', 'High volume of wholesale inventory across all major metros', 'Business-friendly environment supports investor-friendly contracts'],
    marketType: 'High-volume, high-growth across multiple metros',
    avgEntry: '$90,000–$280,000',
  },
  georgia: {
    name: 'Georgia',
    abbr: 'GA',
    cities: 'Atlanta, Savannah, Augusta, and Macon',
    description: 'Georgia\'s real estate market is anchored by Atlanta — one of the most active investment markets in the Southeast. The metro\'s diverse economy, strong job market, and continuing suburban expansion keep demand for off-market wholesale deals consistently high for both flippers and landlords.',
    paragraph2: 'Atlanta\'s intown neighborhoods offer high ARV potential for experienced fix-and-flip investors, while the surrounding suburbs and exurbs present more accessible entry points. Areas like DeKalb, Clayton, and Gwinnett counties regularly produce quality wholesale deals with strong rental backstops.',
    paragraph3: 'Savannah and Augusta offer distinct investment profiles — Savannah with its tourism-driven economy and growing short-term rental market, and Augusta with steady healthcare-driven demand and low price-to-rent ratios that appeal to cash-flow-focused investors.',
    highlights: ['Atlanta is one of the top 5 wholesale markets in the Southeast', 'Strong in-migration from coastal cities and the Midwest', 'Landlord-friendly laws support buy-and-hold strategies', 'Growing film industry driving population growth and housing demand'],
    marketType: 'Metro-driven with expanding suburban markets',
    avgEntry: '$85,000–$250,000',
  },
  ohio: {
    name: 'Ohio',
    abbr: 'OH',
    cities: 'Columbus, Cleveland, Cincinnati, and Dayton',
    description: 'Ohio is one of the most accessible wholesale real estate markets in the country. With some of the lowest median home prices among major states, investors can enter at low basis points while still achieving strong returns — especially in the rental market where tenant demand remains robust.',
    paragraph2: 'Columbus has emerged as Ohio\'s fastest-growing market, driven by Ohio State University, a diversifying tech sector, and sustained in-migration from more expensive Midwestern cities. Wholesale deals in Columbus and surrounding suburbs offer a combination of affordable entry and improving ARV trends.',
    paragraph3: 'Cleveland and Cincinnati are legacy markets with deep inventories of distressed single-family properties. Experienced investors who understand neighborhood-level dynamics in these cities regularly find deals that deliver 15–20% cash-on-cash returns when operated as rentals.',
    highlights: ['Among the most affordable major markets in the US', 'Strong rental demand from large university populations', 'High density of distressed inventory for experienced flippers', 'Low property taxes in many counties compared to neighboring states'],
    marketType: 'Value-oriented with strong rental cash flow',
    avgEntry: '$50,000–$150,000',
  },
  michigan: {
    name: 'Michigan',
    abbr: 'MI',
    cities: 'Detroit, Grand Rapids, Lansing, and Ann Arbor',
    description: 'Michigan offers some of the most compelling wholesale real estate opportunities in the Midwest. Detroit\'s ongoing revitalization has created a two-speed market — strong appreciation in core neighborhoods combined with deep value plays in areas still in early recovery.',
    paragraph2: 'Grand Rapids is one of the standout growth markets in the state, with a diversified economy anchored by healthcare, manufacturing, and education. Wholesale deal flow is healthy, ARVs have been rising consistently, and the rental market is tight — making it attractive for both flippers and landlords.',
    paragraph3: 'Ann Arbor provides a high-quality rental market with steady university-driven demand, while Lansing offers state government and university stability. Investors who build knowledge of Michigan\'s regional market differences can find exceptional value across the state.',
    highlights: ['Detroit revitalization creating strong appreciation in strategic neighborhoods', 'Grand Rapids consistently ranked as a top Midwest investment market', 'Low acquisition costs relative to rent potential in many markets', 'Large inventory of wholesale properties statewide'],
    marketType: 'Value recovery with pockets of high growth',
    avgEntry: '$45,000–$180,000',
  },
  'north-carolina': {
    name: 'North Carolina',
    abbr: 'NC',
    cities: 'Charlotte, Raleigh, Greensboro, and Durham',
    description: 'North Carolina has become one of the most sought-after real estate investment destinations in the country. Charlotte and the Research Triangle have experienced some of the strongest population and job growth in the Southeast, driving housing demand across all price points.',
    paragraph2: 'Charlotte\'s position as a major banking and financial services hub has made it a consistent source of strong ARV appreciation. Wholesale investors in Charlotte find both fix-and-flip and buy-and-hold deals, with exit demand supported by a steady stream of corporate relocation buyers.',
    paragraph3: 'Raleigh-Durham benefits from the concentration of universities and research institutions in the Research Triangle, producing a highly educated, high-income renter population. This makes the area ideal for buy-and-hold investors seeking quality tenants and rising rents.',
    highlights: ['Charlotte and Raleigh in top 10 fastest-growing US metros', 'Strong corporate relocation demand supports flip exit markets', 'Research Triangle drives high-quality rental demand', 'Business-friendly regulatory environment for investors'],
    marketType: 'High-growth with strong exit demand',
    avgEntry: '$95,000–$270,000',
  },
  'south-carolina': {
    name: 'South Carolina',
    abbr: 'SC',
    cities: 'Charleston, Columbia, Greenville, and Myrtle Beach',
    description: 'South Carolina offers a compelling mix of coastal tourism markets, growing inland metros, and strong retirement-driven demand. The state\'s favorable tax climate and quality of life have made it a magnet for in-migration, supporting consistent housing demand across all major metros.',
    paragraph2: 'Charleston is one of the most in-demand coastal markets in the Southeast. Wholesale opportunities exist primarily in surrounding suburban and rural areas, where values haven\'t fully caught up with the core city\'s appreciation. Investors patient enough to find these deals benefit from strong ARV growth.',
    paragraph3: 'Greenville has emerged as one of the top investment markets in the Carolinas, driven by BMW\'s manufacturing hub and a growing tech and healthcare sector. Columbia provides stable state government and university-driven demand, with wholesale deals readily available at accessible price points.',
    highlights: ['Strong in-migration from northern and Midwestern states', 'Myrtle Beach short-term rental market generates strong gross yields', 'Greenville among fastest-growing small metros in the US', 'Low cost of living supports long-term tenant retention'],
    marketType: 'Coastal premium with inland value markets',
    avgEntry: '$80,000–$230,000',
  },
  illinois: {
    name: 'Illinois',
    abbr: 'IL',
    cities: 'Chicago, Rockford, Peoria, and Springfield',
    description: 'Illinois is home to one of the largest wholesale real estate markets in the country. Chicago\'s vast geographic footprint and diverse neighborhood dynamics create consistent deal flow for investors who understand the local market — from high-ARV North Side flips to high-yield South and West Side rentals.',
    paragraph2: 'The Chicago metro\'s size means there are wholesale opportunities at virtually every price point and strategy. Experienced investors build neighborhood-specific knowledge to identify where values are rising and where rental demand is strongest, allowing them to source deals with predictable outcomes.',
    paragraph3: 'Outside Chicago, markets like Rockford and Peoria offer extremely low acquisition costs with surprisingly strong rental yields. These secondary markets attract investors focused on cash flow over appreciation, and the depth of distressed inventory means deal flow is consistently available.',
    highlights: ['Chicago is one of the largest and most liquid real estate markets in the US', 'Deep inventory of distressed properties at varied price points', 'Strong rental demand from Chicago\'s large renter population', 'Secondary markets offer exceptional cash-on-cash returns'],
    marketType: 'Large-market depth with high-yield secondary options',
    avgEntry: '$55,000–$220,000',
  },
  indiana: {
    name: 'Indiana',
    abbr: 'IN',
    cities: 'Indianapolis, Fort Wayne, South Bend, and Evansville',
    description: 'Indiana is one of the most underrated wholesale real estate markets in the Midwest. Indianapolis, in particular, has become a favorite destination for out-of-state investors seeking affordable entry points, strong rental cash flow, and a landlord-friendly legal environment.',
    paragraph2: 'Indianapolis combines the benefits of a large, diversified metro economy with home prices that remain well below the national median. The city\'s healthcare, logistics, and motorsports sectors provide employment stability that translates into consistent rental demand. Wholesale deals close regularly and rehab costs are manageable.',
    paragraph3: 'Fort Wayne and South Bend offer even lower entry points with strong university-driven rental demand. Investors building rental portfolios find that Indiana\'s low property taxes and landlord-friendly laws make it easier to maintain strong cap rates over the long term.',
    highlights: ['Indianapolis is a top 10 market for buy-and-hold cash flow investors', 'Landlord-friendly laws make tenant management more predictable', 'Low property taxes across most Indiana counties', 'Strong wholesale deal flow with motivated sellers statewide'],
    marketType: 'Cash-flow focused with strong landlord protections',
    avgEntry: '$55,000–$160,000',
  },
  kentucky: {
    name: 'Kentucky',
    abbr: 'KY',
    cities: 'Louisville, Lexington, Bowling Green, and Owensboro',
    description: 'Kentucky is one of the most undervalued wholesale real estate markets in the South. With a low cost of living, strong rental demand driven by healthcare and manufacturing employment, and a consistent supply of distressed single-family homes, investors who understand Kentucky\'s market find deals with exceptional cash-on-cash returns.',
    paragraph2: 'Louisville is Kentucky\'s largest and most active investment market. The city\'s combination of affordable acquisition prices, steady rental demand from a large working-class renter population, and improving neighborhoods makes it a standout choice for both fix-and-flip and buy-and-hold investors. Wholesale deal flow in Louisville is consistent, and buyers who move quickly on quality listings can build portfolios efficiently.',
    paragraph3: 'Lexington benefits from the University of Kentucky and a healthcare-driven economy, providing reliable tenant demand and lower vacancy rates. Bowling Green and Owensboro are secondary markets with even lower entry points, attracting investors focused on maximum cash flow over short-term appreciation.',
    highlights: ['Louisville consistently ranked among top cash-flow markets in the Southeast', 'Low acquisition costs with strong price-to-rent ratios statewide', 'Steady rental demand from healthcare and manufacturing employment base', 'Landlord-friendly legal environment supports buy-and-hold strategies'],
    marketType: 'Cash-flow focused with affordable entry points',
    avgEntry: '$50,000–$160,000',
  },
  alabama: {
    name: 'Alabama',
    abbr: 'AL',
    cities: 'Birmingham, Huntsville, Montgomery, and Mobile',
    description: 'Alabama offers some of the most affordable wholesale real estate entry points in the Southeast. Birmingham has long been a top cash-flow market for out-of-state investors, with a large inventory of distressed single-family homes, strong rental demand, and improving neighborhood trajectories that create solid buy-and-hold opportunities.',
    paragraph2: 'Huntsville has emerged as one of the fastest-growing metros in the state, driven by the aerospace and defense industries anchored by Redstone Arsenal and NASA. This economic base has pushed ARVs higher and created strong demand for quality rental housing, making it attractive for investors targeting appreciation alongside cash flow.',
    paragraph3: 'Montgomery and Mobile provide stable government and port-driven economies respectively, with wholesale deal flow that remains consistent and entry prices that allow investors to achieve strong yields without taking on heavy rehab risk.',
    highlights: ['Birmingham a top-10 cash-flow market with consistent wholesale inventory', 'Huntsville among fastest-growing mid-size metros in the US', 'Among the most affordable acquisition markets in the Southeast', 'Landlord-friendly laws with straightforward eviction processes'],
    marketType: 'High-yield cash flow with growth pockets',
    avgEntry: '$45,000–$160,000',
  },
  mississippi: {
    name: 'Mississippi',
    abbr: 'MS',
    cities: 'Jackson, Gulfport, Hattiesburg, and Tupelo',
    description: 'Mississippi offers the lowest median home prices of any state in the country, making it one of the highest cash-yield wholesale markets available to investors willing to understand local dynamics. While appreciation is slower than Sun Belt metros, investors who focus on cash flow find Mississippi properties generate returns that are difficult to match elsewhere.',
    paragraph2: 'Jackson\'s large inventory of distressed single-family homes and steady rental demand from healthcare and government employment make it a consistent source of wholesale deal flow. Investors who specialize in the Jackson market find they can acquire properties at deep discounts and operate them as rentals with double-digit cap rates.',
    paragraph3: 'The Gulf Coast markets of Gulfport and Biloxi benefit from tourism and gaming industry employment, with a growing population that has driven rental demand higher since Hurricane Katrina-era rebuilding created a more modern housing stock.',
    highlights: ['Lowest median home prices in the US — highest potential yield ratios', 'Strong rental demand from government and healthcare employment', 'Consistent wholesale deal inventory across multiple markets', 'Growing Gulf Coast market supported by tourism and gaming industries'],
    marketType: 'Maximum cash yield — high-volume distressed inventory',
    avgEntry: '$35,000–$120,000',
  },
  arkansas: {
    name: 'Arkansas',
    abbr: 'AR',
    cities: 'Little Rock, Fayetteville, Fort Smith, and Jonesboro',
    description: 'Arkansas is one of the most overlooked wholesale real estate markets in the country. With low property taxes, affordable acquisition prices, and a growing economy anchored by Walmart\'s headquarters and a diversifying tech sector in Northwest Arkansas, the state offers investors a compelling combination of value and stability.',
    paragraph2: 'Fayetteville and the broader Northwest Arkansas corridor have experienced significant growth over the past decade, driven by corporate relocations and the spillover effect of Walmart\'s supplier ecosystem. This area commands premium ARVs within the state while still offering entry points far below coastal markets.',
    paragraph3: 'Little Rock provides a stable government and healthcare-driven rental market with consistent wholesale deal flow. Fort Smith and Jonesboro are secondary markets with even lower entry points and reliable tenant demand from manufacturing and university populations respectively.',
    highlights: ['Northwest Arkansas one of fastest-growing metro areas in the US', 'Some of the lowest property taxes in the country', 'Walmart corporate ecosystem drives job stability and rental demand', 'Accessible entry prices with strong price-to-rent ratios statewide'],
    marketType: 'Value-oriented with a high-growth corridor',
    avgEntry: '$45,000–$150,000',
  },
}

const STEPS = [
  { icon: Search, step: '01', title: 'Browse', description: 'Search verified wholesale deals filtered by location, deal type, price, and ARV. Every listing includes real numbers.' },
  { icon: BarChart2, step: '02', title: 'Analyze', description: 'ARV estimates, spread data, and property details are structured on every listing so you can evaluate in minutes.' },
  { icon: MessageCircle, step: '03', title: 'Connect', description: 'Message verified sellers directly through our secure platform. No middlemen, no delays.' },
]

export async function generateStaticParams() {
  return Object.keys(STATE_DATA).map((state) => ({ state }))
}

export async function generateMetadata({ params }) {
  const data = STATE_DATA[params.state]
  if (!data) return {}
  return {
    title: `Wholesale Real Estate in ${data.name} | Verified Deals | DeelMap`,
    description: `Browse verified wholesale real estate deals in ${data.name}. Find off-market investment properties in ${data.cities} and across the state on DeelMap.`,
    keywords: `wholesale real estate ${data.name.toLowerCase()}, wholesale properties ${data.name.toLowerCase()}, investment properties ${data.name.toLowerCase()}, off-market deals ${data.name.toLowerCase()}, ${data.cities.toLowerCase()} real estate investing`,
  }
}

export default function StatePage({ params }) {
  const data = STATE_DATA[params.state]

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px] py-20 text-center">
          <h1 className="text-3xl font-bold text-[#1A1816] mb-4">State not found</h1>
          <Link href="/wholesale-real-estate" className="text-[#D03839] font-semibold">View all wholesale deals</Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">WHOLESALE REAL ESTATE</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Find Wholesale Real Estate Deals in {data.name}
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Browse verified off-market wholesale properties in {data.cities}, and across {data.name}. Every seller is identity-verified. Every listing includes ARV, spread, and property details.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/marketplace?state=${data.abbr}`}
              className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center gap-2"
            >
              Browse {data.name} Deals
            </Link>
            <Link
              href="/wholesale-real-estate"
              className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center"
            >
              View all states
            </Link>
          </div>
        </div>
      </section>

      {/* Market Overview */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">{data.name.toUpperCase()} MARKET</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">
                Investing in {data.name} real estate
              </h2>
              <div className="space-y-4">
                <p className="text-[16px] text-[#444441] leading-relaxed">{data.description}</p>
                <p className="text-[16px] text-[#444441] leading-relaxed">{data.paragraph2}</p>
                <p className="text-[16px] text-[#444441] leading-relaxed">{data.paragraph3}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white border border-[#E8E8E4] rounded p-6">
                <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[1.5px] mb-1">Market Type</p>
                <p className="text-[15px] font-semibold text-[#1A1816]">{data.marketType}</p>
              </div>
              <div className="bg-white border border-[#E8E8E4] rounded p-6">
                <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[1.5px] mb-1">Typical Entry Range</p>
                <p className="text-[15px] font-semibold text-[#1A1816]">{data.avgEntry}</p>
              </div>
              <div className="bg-white border border-[#E8E8E4] rounded p-6">
                <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[1.5px] mb-3">Key Markets</p>
                <p className="text-[15px] text-[#444441]">{data.cities}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">WHY {data.name.toUpperCase()}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">
            Why investors target {data.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5 max-w-[820px] mx-auto">
            {data.highlights.map((highlight, idx) => {
              const icons = [TrendingUp, Shield, Home, Building2]
              const Icon = icons[idx % icons.length]
              return (
                <div key={idx} className="flex items-start gap-4 bg-[#FAFAF8] border border-[#E8E8E4] rounded p-6">
                  <div className="w-9 h-9 bg-[#D03839]/10 rounded flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#D03839]" />
                  </div>
                  <p className="text-[15px] text-[#444441] leading-relaxed">{highlight}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Find a deal in three steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <div key={step.step} className="bg-white border border-[#E8E8E4] rounded p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#D03839]/10 rounded flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#D03839]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#737370] uppercase tracking-[2px]">Step {step.step}</span>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-3">{step.title}</h3>
                  <p className="text-[15px] text-[#444441] leading-relaxed">{step.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">GET STARTED</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">
            Browse wholesale deals in {data.name} now
          </h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Free for buyers. No credit card. Every seller verified. Start finding off-market investment properties in {data.name} today.
          </p>
          <Link
            href={`/marketplace?state=${data.abbr}`}
            className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors"
          >
            View {data.name} Deals
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
