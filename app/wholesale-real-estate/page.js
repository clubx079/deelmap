import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Search, BarChart2, MessageCircle, Hammer, Home, Building2, MapPin } from 'lucide-react'
import { supabaseMarketplace } from '@/lib/supabase'

export const revalidate = 3600

const ABBR_TO_META = {
  AL:{slug:'alabama',name:'Alabama',cities:'Birmingham, Huntsville, Montgomery'},
  AK:{slug:'alaska',name:'Alaska',cities:'Anchorage, Fairbanks, Juneau'},
  AZ:{slug:'arizona',name:'Arizona',cities:'Phoenix, Tucson, Scottsdale'},
  AR:{slug:'arkansas',name:'Arkansas',cities:'Little Rock, Fayetteville, Fort Smith'},
  CA:{slug:'california',name:'California',cities:'Los Angeles, San Diego, Sacramento'},
  CO:{slug:'colorado',name:'Colorado',cities:'Denver, Colorado Springs, Aurora'},
  CT:{slug:'connecticut',name:'Connecticut',cities:'Bridgeport, Hartford, New Haven'},
  DE:{slug:'delaware',name:'Delaware',cities:'Wilmington, Dover, Newark'},
  FL:{slug:'florida',name:'Florida',cities:'Miami, Tampa, Orlando'},
  GA:{slug:'georgia',name:'Georgia',cities:'Atlanta, Savannah, Augusta'},
  HI:{slug:'hawaii',name:'Hawaii',cities:'Honolulu, Kailua, Hilo'},
  ID:{slug:'idaho',name:'Idaho',cities:'Boise, Nampa, Meridian'},
  IL:{slug:'illinois',name:'Illinois',cities:'Chicago, Rockford, Peoria'},
  IN:{slug:'indiana',name:'Indiana',cities:'Indianapolis, Fort Wayne, South Bend'},
  IA:{slug:'iowa',name:'Iowa',cities:'Des Moines, Cedar Rapids, Davenport'},
  KS:{slug:'kansas',name:'Kansas',cities:'Wichita, Overland Park, Topeka'},
  KY:{slug:'kentucky',name:'Kentucky',cities:'Louisville, Lexington, Bowling Green'},
  LA:{slug:'louisiana',name:'Louisiana',cities:'New Orleans, Baton Rouge, Shreveport'},
  ME:{slug:'maine',name:'Maine',cities:'Portland, Lewiston, Bangor'},
  MD:{slug:'maryland',name:'Maryland',cities:'Baltimore, Rockville, Frederick'},
  MA:{slug:'massachusetts',name:'Massachusetts',cities:'Boston, Worcester, Springfield'},
  MI:{slug:'michigan',name:'Michigan',cities:'Detroit, Grand Rapids, Ann Arbor'},
  MN:{slug:'minnesota',name:'Minnesota',cities:'Minneapolis, Saint Paul, Rochester'},
  MS:{slug:'mississippi',name:'Mississippi',cities:'Jackson, Gulfport, Hattiesburg'},
  MO:{slug:'missouri',name:'Missouri',cities:'Kansas City, St. Louis, Springfield'},
  MT:{slug:'montana',name:'Montana',cities:'Billings, Missoula, Bozeman'},
  NE:{slug:'nebraska',name:'Nebraska',cities:'Omaha, Lincoln, Bellevue'},
  NV:{slug:'nevada',name:'Nevada',cities:'Las Vegas, Henderson, Reno'},
  NH:{slug:'new-hampshire',name:'New Hampshire',cities:'Manchester, Nashua, Concord'},
  NJ:{slug:'new-jersey',name:'New Jersey',cities:'Newark, Jersey City, Trenton'},
  NM:{slug:'new-mexico',name:'New Mexico',cities:'Albuquerque, Las Cruces, Santa Fe'},
  NY:{slug:'new-york',name:'New York',cities:'New York City, Buffalo, Rochester'},
  NC:{slug:'north-carolina',name:'North Carolina',cities:'Charlotte, Raleigh, Durham'},
  ND:{slug:'north-dakota',name:'North Dakota',cities:'Fargo, Bismarck, Grand Forks'},
  OH:{slug:'ohio',name:'Ohio',cities:'Columbus, Cleveland, Cincinnati'},
  OK:{slug:'oklahoma',name:'Oklahoma',cities:'Oklahoma City, Tulsa, Norman'},
  OR:{slug:'oregon',name:'Oregon',cities:'Portland, Salem, Eugene'},
  PA:{slug:'pennsylvania',name:'Pennsylvania',cities:'Philadelphia, Pittsburgh, Allentown'},
  RI:{slug:'rhode-island',name:'Rhode Island',cities:'Providence, Cranston, Warwick'},
  SC:{slug:'south-carolina',name:'South Carolina',cities:'Charleston, Columbia, Greenville'},
  SD:{slug:'south-dakota',name:'South Dakota',cities:'Sioux Falls, Rapid City, Aberdeen'},
  TN:{slug:'tennessee',name:'Tennessee',cities:'Nashville, Memphis, Knoxville'},
  TX:{slug:'texas',name:'Texas',cities:'Dallas, Houston, San Antonio'},
  UT:{slug:'utah',name:'Utah',cities:'Salt Lake City, Provo, St. George'},
  VT:{slug:'vermont',name:'Vermont',cities:'Burlington, South Burlington, Rutland'},
  VA:{slug:'virginia',name:'Virginia',cities:'Virginia Beach, Norfolk, Richmond'},
  WA:{slug:'washington',name:'Washington',cities:'Seattle, Spokane, Tacoma'},
  WV:{slug:'west-virginia',name:'West Virginia',cities:'Charleston, Huntington, Morgantown'},
  WI:{slug:'wisconsin',name:'Wisconsin',cities:'Milwaukee, Madison, Green Bay'},
  WY:{slug:'wyoming',name:'Wyoming',cities:'Cheyenne, Casper, Laramie'},
}

export const metadata = {
  title: 'Wholesale Real Estate Deals | Find Verified Properties | DeelMap',
  description: 'Browse thousands of verified wholesale real estate deals across all 50 states. Connect directly with motivated sellers and find off-market properties below market value.',
  keywords: 'wholesale real estate, wholesale real estate deals, find wholesale properties, off-market deals, real estate investing, wholesale properties for sale',
}

const STATS = [
  { value: '10,000+', label: 'Verified Deals' },
  { value: '50', label: 'States Covered' },
  { value: '100%', label: 'Verified Sellers' },
  { value: 'Free', label: 'For Buyers' },
]

const STEPS = [
  {
    icon: Search,
    step: '01',
    title: 'Browse',
    description: 'Search thousands of verified off-market wholesale properties filtered by location, deal type, ARV, and price. Every listing is structured so you see the numbers at a glance.',
  },
  {
    icon: BarChart2,
    step: '02',
    title: 'Analyze',
    description: 'Each deal includes ARV estimates, spread data, and property details so you can evaluate opportunities quickly and confidently without leaving the platform.',
  },
  {
    icon: MessageCircle,
    step: '03',
    title: 'Connect',
    description: 'Contact verified sellers directly through DeelMap\'s secure messaging system. No middlemen, no spam — just direct access to motivated sellers ready to close.',
  },
]

const DEAL_TYPES = [
  {
    icon: Hammer,
    title: 'Fix & Flip',
    description: 'Distressed properties priced below ARV with strong rehab-to-profit potential. Ideal for investors looking for short-term returns in active markets.',
  },
  {
    icon: Home,
    title: 'Buy & Hold',
    description: 'Single-family and small multi-unit properties suited for long-term rental income. Evaluate cash flow projections before you ever contact a seller.',
  },
  {
    icon: Building2,
    title: 'Multi-Family',
    description: 'Duplexes, triplexes, and small apartment buildings sold off-market. Scale your rental portfolio with deals unavailable on the open MLS.',
  },
  {
    icon: MapPin,
    title: 'Land',
    description: 'Vacant lots, rural parcels, and buildable land offered by motivated sellers. A low-barrier entry point for new investors and experienced developers alike.',
  },
]

const OTHERS_LIST = [
  'Duplicate and unverified listings from unknown sources',
  'No deal analysis — just raw addresses with no numbers',
  'Seller identity unknown until after you reach out',
  'Bidding wars and auction pressure on every deal',
  'Fragmented communication across email, text, and phone',
  'Outdated listings that have already been sold',
  'Hidden fees and buyer premiums at closing',
  'No way to filter by deal type, ARV, or spread',
]

const DEELMAP_LIST = [
  'Clean, deduplicated deals tied to verified sellers',
  'ARV, spread, and ROI data on every listing',
  'Every seller is identity-verified before listing',
  'Direct seller contact — no bidding, no pressure',
  'Secure in-platform messaging with every seller',
  'Real-time deal status — active, pending, or closed',
  'Always free for buyers, no hidden costs',
  'Powerful filters for deal type, location, and returns',
]

export default async function WholesaleRealEstatePage() {
  const { data: stateRows } = await supabaseMarketplace
    .from('wholesale_deals')
    .select('state')
    .eq('status', 'active')
    .not('state', 'is', null)

  const activeStates = [...new Set((stateRows || []).map(r => r.state?.trim().toUpperCase()).filter(Boolean))]
    .map(abbr => ABBR_TO_META[abbr])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-20 lg:pb-16 bg-white">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">WHOLESALE REAL ESTATE</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1816] leading-tight mb-6">
            Find Verified Wholesale Real Estate Deals
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            DeelMap connects real estate investors with thousands of verified off-market wholesale properties across the United States. Browse deals with real numbers, contact sellers directly, and close faster — all in one platform built for serious investors.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/marketplace"
              className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center gap-2"
            >
              Browse Deals Now
            </Link>
            <Link
              href="/our-story"
              className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 bg-[#1A1816]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-[13px] text-[#737370]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is Wholesale Real Estate */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <div className="max-w-[760px]">
            <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3">WHAT IS WHOLESALE REAL ESTATE</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-6">Understanding wholesale real estate</h2>
            <div className="space-y-4">
              <p className="text-[16px] text-[#444441] leading-relaxed">
                Wholesale real estate is a strategy where a seller — typically a motivated homeowner or an investor — offers a property at a price significantly below its after-repair value (ARV). These deals are usually off-market, meaning they never appear on the MLS. Instead, they move through direct networks between sellers and buyers who know what they're looking for.
              </p>
              <p className="text-[16px] text-[#444441] leading-relaxed">
                For buyers, wholesale deals represent an opportunity to acquire properties with built-in equity — the difference between the purchase price and the ARV is the investor's margin. Whether you plan to fix and flip, hold for rental income, or assign the contract to another buyer, that spread is what makes wholesale investing attractive.
              </p>
              <p className="text-[16px] text-[#444441] leading-relaxed">
                The challenge has always been finding high-quality wholesale deals before other investors do, and verifying that the numbers are real. Unverified platforms are full of duplicate listings, inflated ARVs, and unresponsive sellers. That's the problem DeelMap solves — by requiring seller verification and structuring every listing with real data before it goes live.
              </p>
              <p className="text-[16px] text-[#444441] leading-relaxed">
                With DeelMap, you get access to wholesale deals where the ARV, spread, and property details have been collected and structured. You can evaluate a deal in minutes, not hours, and reach the seller directly when you're ready to move.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How DeelMap Works */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Find your next deal in three steps</h2>
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

      {/* Deal Types */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">DEAL TYPES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3 text-center">Types of wholesale deals available</h2>
          <p className="text-[16px] text-[#444441] text-center mb-10 max-w-[600px] mx-auto">Every investor has a different strategy. DeelMap carries wholesale deals across all major asset types so you can find what fits your portfolio.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEAL_TYPES.map((type) => {
              const Icon = type.icon
              return (
                <div key={type.title} className="bg-[#FAFAF8] border border-[#E8E8E4] rounded p-6">
                  <div className="w-10 h-10 bg-[#1A1816] rounded flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1816] mb-2">{type.title}</h3>
                  <p className="text-[14px] text-[#444441] leading-relaxed">{type.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* DeelMap vs Others */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">WHY DEELMAP</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-10 text-center">Why find wholesale deals on DeelMap</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#F3F3F1] p-8 rounded border border-[#E8E8E4]">
              <h3 className="text-[18px] font-bold text-[#1A1816] mb-5">Other platforms</h3>
              <ul className="space-y-5">
                {OTHERS_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-[#444441]">
                    <span className="w-4 h-4 rounded-full bg-[#1A1816] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-[#1A1816] p-8 rounded">
              <h3 className="text-[18px] font-bold text-white mb-5">DeelMap</h3>
              <ul className="space-y-5">
                {DEELMAP_LIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-[#A8A8A4]">
                    <span className="w-4 h-4 rounded-full bg-[#D03839] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* State Directory */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px]">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-3 text-center">BY STATE</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-3 text-center">Wholesale deals by state</h2>
          <p className="text-[16px] text-[#444441] text-center mb-10 max-w-[600px] mx-auto">Browse wholesale real estate investment opportunities in top markets across the country.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStates.map(s => (
              <Link
                key={s.slug}
                href={`/wholesale-real-estate/${s.slug}`}
                className="flex items-start gap-4 bg-[#FAFAF8] border border-[#E8E8E4] rounded p-5 hover:border-[#1A1816] transition-colors group"
              >
                <div className="w-9 h-9 bg-[#D03839]/10 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#D03839]" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1A1816] group-hover:text-[#D03839] transition-colors mb-0.5">Wholesale Deals in {s.name}</p>
                  <p className="text-[13px] text-[#737370]">{s.cities}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold text-[#D03839] uppercase tracking-[2px] mb-4">GET STARTED</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1816] mb-4">Start finding wholesale deals today</h2>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Join thousands of investors already sourcing verified off-market deals on DeelMap. Free for buyers — no credit card required.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors"
          >
            Browse the Marketplace
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
