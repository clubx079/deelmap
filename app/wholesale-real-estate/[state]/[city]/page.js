import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Search, BarChart2, MessageCircle, TrendingUp, Shield, Home, Building2 } from 'lucide-react'

const CITY_DATA = {
  tennessee: {
    nashville: {
      name: 'Nashville',
      state: 'Tennessee',
      abbr: 'TN',
      description: 'Nashville is one of the fastest-appreciating real estate markets in the United States. Driven by a booming healthcare and tech sector, consistent in-migration, and a nationally recognized music and tourism economy, the city\'s housing demand has outpaced supply for years. Wholesale investors who know Nashville\'s neighborhoods can find strong fix-and-flip opportunities in areas still catching up to the broader metro\'s appreciation.',
      paragraph2: 'East Nashville, Sylvan Park, and Wedgewood-Houston have all seen significant ARV growth in the past decade, while outer markets like Madison, Antioch, and Smyrna offer more accessible entry points for buy-and-hold investors seeking cash flow alongside appreciation.',
      marketType: 'High-appreciation, competitive',
      avgEntry: '$130,000–$280,000',
      neighborhoods: 'East Nashville, Antioch, Madison, Smyrna, Sylvan Park',
      highlights: [
        'One of the top 5 fastest-appreciating metros in the US over the past decade',
        'Healthcare and tech sector employment provides a large, stable buyer and renter base',
        'Strong short-term rental market driven by tourism and entertainment demand',
        'Outer suburban markets offer below-median entry with strong rental backstops',
      ],
    },
    memphis: {
      name: 'Memphis',
      state: 'Tennessee',
      abbr: 'TN',
      description: 'Memphis is consistently ranked as one of the top buy-and-hold markets in the United States. With median home prices well below the national average and rental yields that frequently exceed 12–15% gross, Memphis draws out-of-state investors from across the country who are building cash-flowing rental portfolios at scale.',
      paragraph2: 'The FedEx hub, large healthcare sector, and port economy provide stable employment that keeps tenant demand consistent. Neighborhoods like Midtown, Cooper-Young, and Cordova offer a range of investment profiles from high-appreciation flips to stable long-term rentals.',
      marketType: 'High-yield buy-and-hold',
      avgEntry: '$60,000–$160,000',
      neighborhoods: 'Midtown, Cooper-Young, Cordova, Germantown, Whitehaven',
      highlights: [
        'Consistently ranked in the top 10 for highest gross rental yields in the US',
        'Deep inventory of single-family wholesale deals at low acquisition costs',
        'FedEx headquarters and large medical center provide stable employment base',
        'Large out-of-state investor demand keeps wholesale deal exits liquid',
      ],
    },
    knoxville: {
      name: 'Knoxville',
      state: 'Tennessee',
      abbr: 'TN',
      description: 'Knoxville offers a compelling combination of affordability and growing demand. Home to the University of Tennessee and anchored by a growing healthcare and manufacturing sector, the city attracts a steady stream of young professionals and university-related renters that support consistent occupancy rates.',
      paragraph2: 'The South Knoxville and North Knoxville neighborhoods have seen renewed investor interest as revitalization spreads from the downtown core. Entry prices remain accessible compared to Nashville and Chattanooga, making Knoxville an attractive market for investors focused on strong cash flow with long-term upside.',
      marketType: 'Value-oriented with growth upside',
      avgEntry: '$80,000–$180,000',
      neighborhoods: 'South Knoxville, North Knoxville, Fountain City, Powell, Maryville',
      highlights: [
        'University of Tennessee drives consistent tenant demand year-round',
        'More affordable entry prices than Nashville with similar rental demand dynamics',
        'Growing tech and healthcare employment supporting long-term resident population',
        'Downtown revitalization spreading into adjacent neighborhoods',
      ],
    },
    chattanooga: {
      name: 'Chattanooga',
      state: 'Tennessee',
      abbr: 'TN',
      description: 'Chattanooga has become one of the most talked-about emerging markets in the Southeast. Known as the first US city to offer citywide gigabit internet, it has attracted a growing startup community, remote workers, and small manufacturers — all of whom need housing in a market that still offers accessible wholesale prices.',
      paragraph2: 'The Northshore, St. Elmo, and Highland Park neighborhoods have seen strong appreciation as Chattanooga\'s urban core revitalizes. Investors who moved early into these areas have seen strong returns, and outer communities like Red Bank and East Ridge still offer wholesale deals with upside potential.',
      marketType: 'Emerging growth market',
      avgEntry: '$85,000–$195,000',
      neighborhoods: 'Northshore, St. Elmo, Highland Park, Red Bank, East Ridge',
      highlights: [
        'First US city with gigabit internet — attracts tech and remote workers',
        'Strong tourism economy driven by outdoor recreation and Tennessee Aquarium',
        'Urban revitalization creating appreciation in historically undervalued neighborhoods',
        'More affordable than Nashville with similar quality-of-life drivers',
      ],
    },
  },
  florida: {
    miami: {
      name: 'Miami',
      state: 'Florida',
      abbr: 'FL',
      description: 'Miami is one of the most dynamic real estate markets in the United States. As a global city with strong international demand, a growing tech and finance sector, and limited land supply, prices in the urban core have risen sharply. Wholesale investors in Miami focus primarily on suburban markets and transitional neighborhoods where motivated sellers still exist.',
      paragraph2: 'Areas like Opa-locka, Homestead, and parts of Miami Gardens offer accessible wholesale entry points for fix-and-flip and buy-and-hold investors, while the broader Miami-Dade footprint offers diverse deal types from single-family rentals to small multi-unit properties.',
      marketType: 'High-appreciation, suburban value plays',
      avgEntry: '$180,000–$380,000',
      neighborhoods: 'Opa-locka, Homestead, Miami Gardens, Hialeah, Miramar',
      highlights: [
        'International demand and tech sector growth driving continued urban appreciation',
        'Short-term rental demand among the strongest in the country year-round',
        'Suburban markets offer accessible entry well below coastal pricing',
        'High tenant demand from large working population keeps vacancies low',
      ],
    },
    tampa: {
      name: 'Tampa',
      state: 'Florida',
      abbr: 'FL',
      description: 'Tampa has emerged as one of Florida\'s most active investment markets over the past five years. Population growth, a diversifying economy anchored by finance, healthcare, and defense, and relative affordability compared to Miami have made Tampa a top destination for wholesale real estate investors.',
      paragraph2: 'Neighborhoods like Seminole Heights, West Tampa, and Ybor City have seen significant appreciation, while suburban areas in Brandon, Riverview, and Plant City offer more accessible entry for investors building rental portfolios or targeting the first-time homebuyer exit market.',
      marketType: 'High-growth with strong rental fundamentals',
      avgEntry: '$130,000–$280,000',
      neighborhoods: 'Seminole Heights, Ybor City, Brandon, Riverview, Plant City',
      highlights: [
        'One of the top 10 fastest-growing metros in the US by population',
        'Lower entry prices than Miami with comparable rental yield potential',
        'Strong exit demand from growing first-time homebuyer population',
        'Year-round tourism and short-term rental demand in waterfront areas',
      ],
    },
    orlando: {
      name: 'Orlando',
      state: 'Florida',
      abbr: 'FL',
      description: 'Orlando\'s real estate market is driven by a uniquely diverse economy that includes tourism, healthcare, aerospace, and a growing tech sector. The city\'s large hospitality workforce creates strong demand for affordable workforce housing, making it one of the most active markets for fix-and-flip and buy-and-hold wholesale deals in the state.',
      paragraph2: 'Areas like Pine Hills, Apopka, Kissimmee, and East Orlando regularly produce wholesale deals at accessible price points. Investors who understand the local neighborhoods can find properties with strong rental backstops and active retail buyer markets for clean exits.',
      marketType: 'High-volume, workforce housing focused',
      avgEntry: '$115,000–$250,000',
      neighborhoods: 'Pine Hills, Apopka, Kissimmee, East Orlando, Ocoee',
      highlights: [
        'Tourism economy creates large workforce housing demand year-round',
        'High volume of wholesale inventory compared to other Florida metros',
        'Strong vacation rental potential in Kissimmee and Disney-adjacent areas',
        'Growing tech and aerospace sectors attract high-income renter population',
      ],
    },
    jacksonville: {
      name: 'Jacksonville',
      state: 'Florida',
      abbr: 'FL',
      description: 'Jacksonville is the largest city by land area in the contiguous United States, and that geographic size means a diverse range of real estate markets within a single metro. With significant military presence, strong healthcare and logistics employment, and home prices well below the Florida coastal average, Jacksonville attracts investors focused on cash flow and affordability.',
      paragraph2: 'The Northside, Westside, and Arlington neighborhoods offer consistent wholesale deal flow at accessible price points, while the Beaches and San Marco areas command higher ARVs for investors with the capacity for larger rehabs.',
      marketType: 'Affordable, high-volume market',
      avgEntry: '$90,000–$210,000',
      neighborhoods: 'Northside, Arlington, Westside, San Marco, Mandarin',
      highlights: [
        'Military bases create stable, long-term tenant demand in surrounding neighborhoods',
        'More affordable than any other major Florida metro',
        'Large geographic footprint means consistent wholesale inventory',
        'Strong logistics and healthcare employment base supports rental demand',
      ],
    },
  },
  texas: {
    dallas: {
      name: 'Dallas',
      state: 'Texas',
      abbr: 'TX',
      description: 'Dallas-Fort Worth is one of the largest wholesale real estate markets in the country. Corporate relocations, strong job growth across multiple sectors, and consistent suburban expansion have created a deep deal pipeline that produces wholesale opportunities for every investor type — from high-ARV urban flips to affordable suburban buy-and-hold rentals.',
      paragraph2: 'South Dallas, Oak Cliff, Pleasant Grove, and parts of Mesquite and Garland offer consistent wholesale deal flow with strong rental backstops. Meanwhile, improving neighborhoods in East Dallas and parts of Irving offer higher ARVs for investors with rehab experience.',
      marketType: 'High-volume, diversified market',
      avgEntry: '$110,000–$260,000',
      neighborhoods: 'South Dallas, Oak Cliff, Garland, Mesquite, Irving',
      highlights: [
        'One of the top 3 wholesale markets by deal volume in the United States',
        'Corporate relocations from CA, NY, and IL drive consistent exit demand',
        'No state income tax and business-friendly environment attracts continued investment',
        'Large suburban footprint with diverse deal types at every price point',
      ],
    },
    houston: {
      name: 'Houston',
      state: 'Texas',
      abbr: 'TX',
      description: 'Houston is the most geographically diverse wholesale real estate market in Texas. As the fourth-largest city in the United States, it offers deal flow ranging from entry-level rentals in the east side to high-ARV flips in the Inner Loop and Heights — all within a single metro. The energy sector, Texas Medical Center, and Port of Houston provide layered economic stability.',
      paragraph2: 'Neighborhoods like Acres Homes, Sunnyside, Third Ward, and parts of Pasadena and Baytown offer accessible wholesale entry points for investors building rental portfolios. The high volume of motivated sellers and active investor network make Houston one of the most liquid wholesale markets in the country.',
      marketType: 'High-volume, multi-strategy market',
      avgEntry: '$95,000–$240,000',
      neighborhoods: 'Acres Homes, Sunnyside, Pasadena, Baytown, Third Ward',
      highlights: [
        'Texas Medical Center — the largest in the world — anchors housing demand across the metro',
        'Extremely high deal volume due to city size and active wholesale network',
        'No zoning laws create flexibility for investors on property use',
        'Strong rental demand from large blue-collar and professional workforce',
      ],
    },
    'san-antonio': {
      name: 'San Antonio',
      state: 'Texas',
      abbr: 'TX',
      description: 'San Antonio is one of the most stable wholesale real estate markets in Texas. Military bases including Fort Sam Houston, Lackland, and Randolph contribute a large, consistent tenant population, while the healthcare sector and tourism economy provide additional employment stability. Entry prices are significantly lower than Austin or Dallas, making it a preferred market for cash-flow-focused investors.',
      paragraph2: 'The South Side, West Side, and Northeast San Antonio neighborhoods regularly produce wholesale deals at accessible price points. The city\'s steady population growth and low-cost-of-living positioning continue to attract residents, keeping rental vacancy rates low.',
      marketType: 'Stable, cash-flow focused',
      avgEntry: '$85,000–$200,000',
      neighborhoods: 'South Side, West Side, Northeast San Antonio, Converse, Live Oak',
      highlights: [
        'Five major military installations create stable, year-round rental demand',
        'Lower entry prices than Dallas or Austin with comparable rental demand',
        'Healthcare sector employment provides economic stability beyond tourism',
        'Strong population growth among young families seeking affordable housing',
      ],
    },
    austin: {
      name: 'Austin',
      state: 'Texas',
      abbr: 'TX',
      description: 'Austin has become one of the most competitive real estate markets in the country. The tech sector\'s dominance — with Tesla, Apple, and hundreds of startups establishing operations in the metro — has driven ARVs sharply higher. Wholesale deals in Austin proper are rare, but the broader metro including Round Rock, Pflugerville, Kyle, and Bastrop offers investor opportunities at more accessible price points.',
      paragraph2: 'East Austin, which was a wholesale-heavy market a decade ago, has appreciated significantly. Today\'s investor opportunities in the Austin metro are concentrated in suburban communities where motivated seller inventory still exists and exits to retail buyers remain strong.',
      marketType: 'High-ARV, competitive suburban plays',
      avgEntry: '$180,000–$360,000',
      neighborhoods: 'Round Rock, Pflugerville, Kyle, Bastrop, Manor',
      highlights: [
        'Tech sector growth from Tesla, Apple, and hundreds of startups drives premium ARVs',
        'Strong exit demand — Austin buyers are well-qualified and motivated',
        'Suburban markets offer investor-accessible pricing with urban appreciation trends',
        'University of Texas creates consistent high-quality rental demand',
      ],
    },
  },
  georgia: {
    atlanta: {
      name: 'Atlanta',
      state: 'Georgia',
      abbr: 'GA',
      description: 'Atlanta is the dominant wholesale real estate market in the Southeast. Its diverse economy — spanning Fortune 500 headquarters, a major film production industry, healthcare, logistics, and Hartsfield-Jackson Airport — creates layered employment demand that supports housing across every price point. Wholesale investors consistently find opportunities in both the urban core and the vast suburban ring.',
      paragraph2: 'Neighborhoods like South Atlanta, Pittsburgh, Reynoldstown, and parts of College Park and East Point offer consistent deal flow with improving ARVs, while suburban markets in Clayton, Henry, and Rockdale counties provide higher-volume inventory for investors building portfolios.',
      marketType: 'High-volume, high-growth',
      avgEntry: '$90,000–$260,000',
      neighborhoods: 'South Atlanta, East Point, College Park, Decatur, Stone Mountain',
      highlights: [
        'Hartsfield-Jackson is the world\'s busiest airport — creates massive logistics employment',
        'Film industry driving population growth and income diversity',
        'Strong in-migration from coastal cities and Midwest metros',
        'Large suburban footprint means consistent wholesale inventory at all price points',
      ],
    },
    savannah: {
      name: 'Savannah',
      state: 'Georgia',
      abbr: 'GA',
      description: 'Savannah offers a unique investment profile driven by tourism, the Port of Savannah (the fastest-growing container port in the US), Gulfstream Aerospace, and the Savannah College of Art and Design. This multi-sector economy has created strong housing demand across both the historic district and the surrounding communities.',
      paragraph2: 'The historic district\'s renovation potential attracts investors comfortable with older homes, while areas like Pooler, Richmond Hill, and Garden City offer more accessible wholesale entry points with strong tenant demand from port and aerospace workers.',
      marketType: 'Tourism and industrial hybrid market',
      avgEntry: '$110,000–$240,000',
      neighborhoods: 'Pooler, Richmond Hill, Garden City, Port Wentworth, Thunderbolt',
      highlights: [
        'Port of Savannah is the fastest-growing container port in the US — drives logistics employment',
        'Gulfstream Aerospace provides high-income, stable employment base',
        'Tourism economy supports short-term rental demand year-round',
        'SCAD student population creates consistent rental demand in historic neighborhoods',
      ],
    },
    augusta: {
      name: 'Augusta',
      state: 'Georgia',
      abbr: 'GA',
      description: 'Augusta is an underrated wholesale market with a stable, diverse economy anchored by Fort Eisenhower (formerly Fort Gordon), the Augusta University Medical Center, and the Savannah River Site. These employers create consistent housing demand across the metro, keeping rental vacancies low and wholesale deal flow steady.',
      paragraph2: 'The north Augusta, south Augusta, and Martinez areas offer wholesale deals at some of the most accessible price points in Georgia, with price-to-rent ratios that appeal strongly to cash-flow-focused investors. The annual Masters Golf Tournament also drives a short-term rental premium.',
      marketType: 'Stable, high-yield market',
      avgEntry: '$65,000–$165,000',
      neighborhoods: 'Martinez, Evans, Grovetown, South Augusta, Hephzibah',
      highlights: [
        'Fort Eisenhower military presence creates stable, long-term tenant demand',
        'Augusta University Medical Center anchors healthcare employment',
        'Masters Golf Tournament drives short-term rental income potential',
        'Among the most accessible wholesale entry prices in Georgia',
      ],
    },
    macon: {
      name: 'Macon',
      state: 'Georgia',
      abbr: 'GA',
      description: 'Macon is one of the most affordable wholesale real estate markets in Georgia. As a geographic hub in the middle of the state, Macon benefits from logistics employment, healthcare, and education anchored by Mercer University. Entry prices are well below the state average, making it a popular target for investors focused on yield over appreciation.',
      paragraph2: 'Neighborhoods on the north and east sides of Macon offer consistent wholesale inventory with high gross rental yields. The city\'s ongoing revitalization initiatives in the downtown core and surrounding areas are beginning to drive awareness and appreciation from previously dormant levels.',
      marketType: 'High-yield, affordable entry',
      avgEntry: '$45,000–$130,000',
      neighborhoods: 'Ingleside, Shirley Hills, North Macon, East Macon, Warner Robins',
      highlights: [
        'Among the lowest wholesale entry prices in the Southeast with strong rental yields',
        'Mercer University and Macon State College drive consistent student rental demand',
        'Robins Air Force Base nearby in Warner Robins adds military tenant population',
        'Downtown revitalization creating early-stage appreciation opportunity',
      ],
    },
  },
  ohio: {
    columbus: {
      name: 'Columbus',
      state: 'Ohio',
      abbr: 'OH',
      description: 'Columbus is the most dynamic real estate market in Ohio. Anchored by Ohio State University — one of the largest universities in the country — and a growing tech and healthcare sector, the city has attracted consistent in-migration that keeps housing demand elevated. Columbus has outperformed other Midwest metros on appreciation while maintaining accessible wholesale entry points.',
      paragraph2: 'The Short North, Italian Village, and Franklinton neighborhoods have appreciated significantly and continue to attract fix-and-flip investment, while the South Side, Linden, and Whitehall offer higher-volume wholesale inventory for buy-and-hold investors focused on cash flow.',
      marketType: 'Growth-oriented with value pockets',
      avgEntry: '$70,000–$180,000',
      neighborhoods: 'Franklinton, Linden, South Side, Whitehall, Gahanna',
      highlights: [
        'Ohio State University is one of the largest in the US — drives massive rental demand',
        'Fastest-appreciating metro in Ohio over the past decade',
        'Growing tech sector attracting young professionals and increasing housing demand',
        'Intel semiconductor plant bringing thousands of high-paying jobs to the region',
      ],
    },
    cleveland: {
      name: 'Cleveland',
      state: 'Ohio',
      abbr: 'OH',
      description: 'Cleveland is one of the highest-yield wholesale real estate markets in the United States. With some of the lowest median home prices among major metros and strong rental demand driven by Cleveland Clinic, University Hospitals, and Case Western Reserve University, investors regularly achieve double-digit cash-on-cash returns on correctly underwritten deals.',
      paragraph2: 'Neighborhoods in the east side, including Garfield Heights, Cleveland Heights, and South Euclid, offer consistent wholesale inventory and strong rental backstops. Investors with local market knowledge regularly find deals trading at 50–60% of ARV that deliver exceptional long-term portfolio performance.',
      marketType: 'High-yield, deep-value market',
      avgEntry: '$45,000–$130,000',
      neighborhoods: 'Garfield Heights, Cleveland Heights, South Euclid, Maple Heights, Lakewood',
      highlights: [
        'Cleveland Clinic is one of the top-ranked hospitals in the world — anchors housing demand',
        'Among the highest gross rental yields of any major US metro',
        'Deep inventory of wholesale deals at below-national-average prices',
        'University Circle\'s growth driving appreciation in surrounding neighborhoods',
      ],
    },
    cincinnati: {
      name: 'Cincinnati',
      state: 'Ohio',
      abbr: 'OH',
      description: 'Cincinnati offers a stable, diversified wholesale real estate market anchored by Procter & Gamble, Cincinnati Children\'s Hospital, the University of Cincinnati, and a growing startup scene. The city\'s consistent employment base keeps rental demand steady across a range of neighborhoods, and wholesale deal flow is reliable year-round.',
      paragraph2: 'Neighborhoods like Norwood, Avondale, Madisonville, and North College Hill regularly produce wholesale inventory at accessible prices. Cincinnati\'s proximity to Northern Kentucky and Dayton extends the metro\'s investment footprint, giving investors a broader range of deal types and exit strategies.',
      marketType: 'Stable, diversified market',
      avgEntry: '$55,000–$155,000',
      neighborhoods: 'Norwood, Avondale, Madisonville, North College Hill, Fairfield',
      highlights: [
        'P&G headquarters provides stable Fortune 500 employment and housing demand',
        'Cincinnati Children\'s consistently ranked among top hospitals nationally',
        'Consistent wholesale inventory across diverse neighborhood types',
        'Access to Northern Kentucky market extends investment options',
      ],
    },
    dayton: {
      name: 'Dayton',
      state: 'Ohio',
      abbr: 'OH',
      description: 'Dayton is one of the most underrated wholesale real estate markets in the Midwest. Wright-Patterson Air Force Base — the largest single-site employer in Ohio — provides a massive, stable tenant population. Combined with Wright State University, the University of Dayton, and a growing advanced manufacturing sector, the city delivers consistent rental demand at very accessible entry prices.',
      paragraph2: 'The Huber Heights, Beavercreek, and Kettering suburbs around Dayton offer strong price-to-rent ratios with lower competition than Columbus or Cincinnati, making them popular targets for out-of-state buy-and-hold investors.',
      marketType: 'Military-anchored, high-yield',
      avgEntry: '$50,000–$140,000',
      neighborhoods: 'Huber Heights, Beavercreek, Kettering, Riverside, Fairborn',
      highlights: [
        'Wright-Patterson AFB is the largest single-site employer in Ohio',
        'Very accessible entry prices with strong rental yield potential',
        'Two major universities drive consistent student and young professional tenant demand',
        'Lower investor competition than Columbus or Cincinnati',
      ],
    },
  },
  michigan: {
    detroit: {
      name: 'Detroit',
      state: 'Michigan',
      abbr: 'MI',
      description: 'Detroit\'s real estate market is one of the most complex and opportunity-rich in the country. Years of revitalization investment in the downtown core and Midtown have created strong appreciation in strategic neighborhoods, while deep value plays remain in areas still in early recovery. Investors with local knowledge and patience have achieved exceptional returns in Detroit over the past decade.',
      paragraph2: 'Neighborhoods like Woodbridge, Corktown, North End, and University District offer improving fundamentals with growing buyer demand for rehabilitated properties. Suburban markets including Warren, Sterling Heights, and Dearborn offer more predictable cash flow with established rental markets.',
      marketType: 'Dual-speed — value recovery plus core appreciation',
      avgEntry: '$35,000–$160,000',
      neighborhoods: 'Woodbridge, Corktown, Warren, Sterling Heights, Dearborn',
      highlights: [
        'Major automaker and tech investment in downtown driving core revitalization',
        'Among the lowest acquisition costs of any major US metro',
        'Large suburban footprint with established rental demand',
        'Significant institutional investment bringing capital and credibility to recovery areas',
      ],
    },
    'grand-rapids': {
      name: 'Grand Rapids',
      state: 'Michigan',
      abbr: 'MI',
      description: 'Grand Rapids is one of the standout growth markets in the Midwest. Its diversified economy — anchored by healthcare giants Spectrum Health and Mercy Health, strong manufacturing, and a growing craft beverage and food scene — has attracted consistent in-migration and driven housing demand well above supply. ARVs have risen steadily for the past several years.',
      paragraph2: 'The Heritage Hill, Eastown, and Madison Area neighborhoods attract high-quality fix-and-flip investors, while the suburbs of Kentwood, Wyoming, and Byron Center offer more affordable wholesale entry with strong long-term rental demand from healthcare and manufacturing workers.',
      marketType: 'High-growth Midwest market',
      avgEntry: '$80,000–$210,000',
      neighborhoods: 'Heritage Hill, Kentwood, Wyoming, Byron Center, Grandville',
      highlights: [
        'Consistently ranked as one of the fastest-growing small metros in the Midwest',
        'Spectrum Health and Mercy Health among the largest employers in the state',
        'Rising ARVs with still-accessible wholesale entry prices',
        'Strong quality-of-life reputation attracting young families and professionals',
      ],
    },
    lansing: {
      name: 'Lansing',
      state: 'Michigan',
      abbr: 'MI',
      description: 'Lansing offers the stability of a state capital combined with a large university population from Michigan State University. These two anchors — government employment and university-driven housing demand — create a resilient real estate market that performs consistently regardless of broader economic cycles.',
      paragraph2: 'East Lansing, where Michigan State is located, has a premium rental market with low vacancies, while the broader Lansing market in areas like Waverly and South Lansing offers more accessible wholesale prices for investors targeting working families and state employees.',
      marketType: 'Stable, government-anchored',
      avgEntry: '$65,000–$165,000',
      neighborhoods: 'East Lansing, Waverly, South Lansing, Delta Township, DeWitt',
      highlights: [
        'Michigan State University drives consistent student and young professional housing demand',
        'State government employment provides economic stability across all market cycles',
        'Accessible entry prices with reliable year-round tenant demand',
        'Lower investor competition than Detroit or Grand Rapids',
      ],
    },
    'ann-arbor': {
      name: 'Ann Arbor',
      state: 'Michigan',
      abbr: 'MI',
      description: 'Ann Arbor is one of the most premium rental markets in Michigan. The University of Michigan — consistently ranked among the top universities globally — creates enormous demand for quality rental housing, and the city\'s growing tech and biotech sector has attracted high-income professionals who compete for limited housing inventory.',
      paragraph2: 'Wholesale deals in Ann Arbor proper are rare due to tight inventory and high demand, but neighboring communities like Ypsilanti, Saline, and Superior Township offer investors accessible entry points within commuting distance. Properties renovated to a high standard in Ann Arbor\'s surrounding areas command premium rents.',
      marketType: 'University-premium, tight inventory',
      avgEntry: '$110,000–$260,000',
      neighborhoods: 'Ypsilanti, Saline, Superior Township, Pittsfield Township, Chelsea',
      highlights: [
        'University of Michigan drives one of the strongest university rental markets in the country',
        'Growing biotech and tech sector creates high-income professional housing demand',
        'Consistently low vacancy rates due to persistent demand exceeding supply',
        'Neighboring Ypsilanti offers accessible entry with access to Ann Arbor rental demand',
      ],
    },
  },
  'north-carolina': {
    charlotte: {
      name: 'Charlotte',
      state: 'North Carolina',
      abbr: 'NC',
      description: 'Charlotte is the second-largest banking center in the United States and one of the fastest-growing major metros in the country. Bank of America and Wells Fargo headquarters anchor a financial services sector that attracts high-income professionals, while consistent corporate relocations from more expensive metros keep buyer demand elevated across the metro.',
      paragraph2: 'Neighborhoods like West Charlotte, Steele Creek, University City, and parts of Gastonia and Concord offer consistent wholesale deal flow with strong exit markets. The Charlotte metro\'s growth trajectory gives investors confidence in both fix-and-flip and buy-and-hold strategies.',
      marketType: 'High-growth, banking hub',
      avgEntry: '$100,000–$260,000',
      neighborhoods: 'West Charlotte, University City, Gastonia, Concord, Kannapolis',
      highlights: [
        'Second-largest US banking center — Bank of America and Wells Fargo headquarters',
        'One of the fastest-growing major metros in the Southeast by population',
        'Strong corporate relocation demand creates active retail buyer exit market',
        'Diverse economy reduces concentration risk for long-term investors',
      ],
    },
    raleigh: {
      name: 'Raleigh',
      state: 'North Carolina',
      abbr: 'NC',
      description: 'Raleigh, as part of the Research Triangle, benefits from the highest concentration of university-affiliated research and tech employment in the Southeast. Duke University, NC State, and UNC-Chapel Hill create a highly educated tenant base, while Apple, Google, and numerous biotech companies have established major operations in the area.',
      paragraph2: 'Areas like Southeast Raleigh, Knightdale, Garner, and parts of Durham offer wholesale deals at accessible prices with strong rental demand. The Triangle\'s continued tech expansion means new housing demand consistently exceeds supply, supporting strong wholesale exit markets.',
      marketType: 'Tech-driven, high-education market',
      avgEntry: '$110,000–$270,000',
      neighborhoods: 'Southeast Raleigh, Knightdale, Garner, Fuquay-Varina, Clayton',
      highlights: [
        'Research Triangle is the top tech employment cluster in the Southeast',
        'Three major research universities create exceptional quality tenant demand',
        'Apple and Google expanding in Raleigh — driving income and housing demand',
        'Strong retail buyer exit market driven by well-qualified corporate buyers',
      ],
    },
    greensboro: {
      name: 'Greensboro',
      state: 'North Carolina',
      abbr: 'NC',
      description: 'Greensboro offers a more affordable entry point into the North Carolina market with steady, reliable demand. The city\'s diverse economy — including logistics (FedEx and UPS regional hubs), healthcare, and a cluster of universities — provides stable employment that supports consistent rental demand across all price points.',
      paragraph2: 'East Greensboro, Southeast Greensboro, and neighborhoods near Bennett College and NC A&T University offer consistent wholesale inventory. Investors who operate in Greensboro alongside the more competitive Charlotte and Raleigh markets use it as a diversification play with higher yields.',
      marketType: 'Stable, diversified, affordable',
      avgEntry: '$70,000–$170,000',
      neighborhoods: 'East Greensboro, High Point, Kernersville, Burlington, Eden',
      highlights: [
        'FedEx and UPS regional hubs anchor strong logistics employment',
        'Multiple HBCU campuses drive consistent student housing demand',
        'More accessible entry prices than Charlotte or Raleigh',
        'Lower investor competition creates more opportunity for off-market deals',
      ],
    },
    durham: {
      name: 'Durham',
      state: 'North Carolina',
      abbr: 'NC',
      description: 'Durham is one of the most exciting transformation stories in the Southeast. A city once defined by tobacco industry decline, Durham has reinvented itself as a hub for biotech, healthcare, and tech startups, anchored by Duke University and the Durham VA Medical Center. Property values have risen significantly, and quality wholesale deals still exist in areas adjacent to Durham\'s revitalized core.',
      paragraph2: 'East Durham, Old East Durham, and Walltown have been targets of investor interest as revitalization spreads from the core. Surrounding communities including Durham County\'s suburban ring offer more accessible prices for investors focused on buy-and-hold strategies near Duke University\'s employment base.',
      marketType: 'Revitalization-driven, high-upside',
      avgEntry: '$100,000–$240,000',
      neighborhoods: 'East Durham, Old East Durham, Walltown, Research Triangle Park area, Chapel Hill',
      highlights: [
        'Duke University is one of the top-ranked research institutions in the world',
        'Rapid revitalization and tech investment creating strong appreciation momentum',
        'Research Triangle Park nearby — the largest research park in the US',
        'Biotech and healthcare growth attracting high-income professionals',
      ],
    },
  },
  'south-carolina': {
    charleston: {
      name: 'Charleston',
      state: 'South Carolina',
      abbr: 'SC',
      description: 'Charleston is one of the most desirable real estate markets in the Southeast. With a world-class historic district, a growing tech and aerospace sector anchored by Boeing and Volvo, and year-round tourism, demand for housing in the Charleston area has pushed prices significantly above the state average. Wholesale investors focus primarily on the North Charleston, Ladson, and Summerville suburbs.',
      paragraph2: 'North Charleston, Goose Creek, and Summerville offer consistent wholesale deal flow at more accessible price points than the peninsula, while still benefiting from the broader metro\'s appreciation trends and strong rental demand from Boeing, Volvo, and Joint Base Charleston employees.',
      marketType: 'Premium coastal with affordable suburban ring',
      avgEntry: '$120,000–$280,000',
      neighborhoods: 'North Charleston, Goose Creek, Summerville, Ladson, Hanahan',
      highlights: [
        'Boeing and Volvo manufacturing facilities anchor high-income employment base',
        'Tourism economy drives exceptional short-term rental demand year-round',
        'One of the fastest-growing metros in South Carolina',
        'Suburban ring offers accessible pricing relative to strong metro appreciation',
      ],
    },
    columbia: {
      name: 'Columbia',
      state: 'South Carolina',
      abbr: 'SC',
      description: 'Columbia offers the stability of a state capital with the vitality of a major university city. The University of South Carolina\'s large enrollment, combined with state government and Fort Jackson military employment, creates diverse, multi-layered housing demand. Wholesale investors find consistent deal flow and predictable rental markets throughout the Columbia metro.',
      paragraph2: 'The Northeast Columbia, Irmo, and Lexington corridors offer suburban wholesale deals with strong families-as-tenants demand, while areas around USC attract young professional and student renters. Entry prices remain below the national median, making Columbia attractive for investors building cash-flowing portfolios.',
      marketType: 'Stable, multi-anchor market',
      avgEntry: '$80,000–$190,000',
      neighborhoods: 'Northeast Columbia, Irmo, Lexington, Forest Acres, Cayce',
      highlights: [
        'University of South Carolina creates consistent student housing demand',
        'Fort Jackson is one of the largest Army training bases in the US',
        'State capital employment provides economic stability through all cycles',
        'Accessible entry prices relative to Charleston and Greenville',
      ],
    },
    greenville: {
      name: 'Greenville',
      state: 'South Carolina',
      abbr: 'SC',
      description: 'Greenville has emerged as one of the top investment markets in the Carolinas. BMW\'s US manufacturing headquarters, Michelin\'s North American headquarters, and a cluster of advanced manufacturing suppliers have created a high-income employment base that drives housing demand well above state averages. The downtown area has been transformed, and suburban communities continue to grow rapidly.',
      paragraph2: 'Neighborhoods in West Greenville and Nicholtown have attracted investor attention as revitalization spreads from the award-winning downtown core. Suburban communities like Mauldin, Simpsonville, and Taylors offer consistent wholesale inventory with strong rental demand from manufacturing sector employees.',
      marketType: 'Manufacturing-driven, fastest-growing SC market',
      avgEntry: '$85,000–$210,000',
      neighborhoods: 'Mauldin, Simpsonville, Taylors, Fountain Inn, Greer',
      highlights: [
        'BMW and Michelin North American headquarters anchor high-income employment',
        'Consistently among the fastest-growing small metros in the Southeast',
        'Award-winning downtown revitalization driving citywide appreciation',
        'Advanced manufacturing cluster creating diverse, stable employment',
      ],
    },
    'myrtle-beach': {
      name: 'Myrtle Beach',
      state: 'South Carolina',
      abbr: 'SC',
      description: 'Myrtle Beach is one of the top short-term rental markets on the East Coast. The Grand Strand\'s 60 miles of coastline attracts millions of tourists annually, creating extraordinary short-term rental demand. Investors in Myrtle Beach focus heavily on vacation rental potential alongside long-term appreciation driven by retiree in-migration from the Northeast and Midwest.',
      paragraph2: 'While oceanfront properties command premium prices, the inland and Murrells Inlet areas offer wholesale opportunities at accessible entry points that still benefit from the area\'s tourism-driven rental demand. Year-round retiree residents and seasonal tourists combine to keep vacancy rates among the lowest in the state.',
      marketType: 'Tourism and retirement driven',
      avgEntry: '$95,000–$230,000',
      neighborhoods: 'Surfside Beach, Murrells Inlet, Conway, Socastee, Carolina Forest',
      highlights: [
        'Short-term rental demand among the highest on the entire East Coast',
        'Major retiree in-migration from Northeast and Midwest creates stable long-term demand',
        'Tourism economy generates consistent rental income across all seasons',
        'Inland markets offer accessible wholesale pricing near the coast',
      ],
    },
  },
  illinois: {
    chicago: {
      name: 'Chicago',
      state: 'Illinois',
      abbr: 'IL',
      description: 'Chicago is one of the largest and most liquid wholesale real estate markets in the United States. The city\'s enormous geographic footprint, diverse economy, and large population of renters create consistent deal flow across a wide range of price points and strategies. Investors who understand Chicago\'s neighborhood-level dynamics can identify opportunities that outperform national averages significantly.',
      paragraph2: 'South Side neighborhoods like Englewood, Auburn Gresham, and Chatham offer high-volume wholesale inventory with strong rental yields. The West Side\'s Humboldt Park, Austin, and Garfield Park are attracting early-stage investment as revitalization capital begins to flow in. Chicago\'s north and northwest suburbs offer more predictable cash flow with established rental markets.',
      marketType: 'Large-market depth, neighborhood-dependent',
      avgEntry: '$55,000–$230,000',
      neighborhoods: 'Englewood, Auburn Gresham, Humboldt Park, South Shore, Cicero',
      highlights: [
        'One of the largest and most liquid wholesale markets in the United States',
        'Enormous geographic diversity — strategies from high-yield rentals to high-ARV flips',
        'Large renter population creates consistent demand across all price points',
        'O\'Hare and Midway airports anchor a massive logistics and hospitality employment base',
      ],
    },
    rockford: {
      name: 'Rockford',
      state: 'Illinois',
      abbr: 'IL',
      description: 'Rockford is one of the highest-yield wholesale markets in Illinois. As the second-largest city in the state outside Chicago, Rockford offers extremely accessible entry prices with consistent tenant demand from a healthcare and manufacturing employment base. Investors focused purely on cash flow find Rockford one of the most attractive markets in the entire Midwest.',
      paragraph2: 'The north and west sides of Rockford offer consistent wholesale inventory at very low acquisition costs. SwedishAmerican Health System and OSF HealthCare provide stable healthcare employment, while Rockford\'s growing airport and logistics sector add additional employment diversity.',
      marketType: 'High-yield, affordable entry',
      avgEntry: '$40,000–$110,000',
      neighborhoods: 'North Rockford, West Rockford, Cherry Valley, Loves Park, Machesney Park',
      highlights: [
        'Among the lowest wholesale entry prices of any major Illinois market',
        'Healthcare employment from multiple large hospital systems drives rental demand',
        'High gross rental yields — some of the best in the Midwest',
        'Less investor competition than Chicago means more direct access to motivated sellers',
      ],
    },
    peoria: {
      name: 'Peoria',
      state: 'Illinois',
      abbr: 'IL',
      description: 'Peoria\'s real estate market is anchored by Caterpillar Inc. headquarters, OSF HealthCare, and Illinois Central College. This combination of corporate, healthcare, and educational employment creates a stable, diversified housing demand that keeps rental vacancy rates low. Wholesale entry prices are among the most accessible in the state.',
      paragraph2: 'The Peoria Heights, East Bluff, and North Peoria areas offer consistent wholesale inventory with strong price-to-rent ratios. Investors who understand the local market regularly achieve high yields on correctly priced deals without competing with the volume of buyers that larger metro areas attract.',
      marketType: 'Corporate-anchored, high-yield',
      avgEntry: '$45,000–$130,000',
      neighborhoods: 'Peoria Heights, East Bluff, North Peoria, Morton, East Peoria',
      highlights: [
        'Caterpillar Inc. global headquarters anchors significant corporate employment',
        'OSF HealthCare is one of the largest not-for-profit health systems in Illinois',
        'Very accessible wholesale entry prices relative to rental income potential',
        'Stable employer base creates predictable long-term tenant demand',
      ],
    },
    springfield: {
      name: 'Springfield',
      state: 'Illinois',
      abbr: 'IL',
      description: 'Springfield offers the reliability of a state capital market with University of Illinois Springfield and a strong healthcare presence adding employment diversity. Government employment creates economic stability through all market cycles, while the city\'s position as a historical tourism destination adds incremental income potential for short-term rental investors.',
      paragraph2: 'The Westside, Southeast Springfield, and South Side neighborhoods offer consistent wholesale inventory at accessible prices. State government employment ensures a steady flow of tenants — particularly important during economic downturns when private sector employment contracts.',
      marketType: 'Stable, government-anchored',
      avgEntry: '$50,000–$135,000',
      neighborhoods: 'Westside, Southeast Springfield, Chatham, Sherman, Rochester',
      highlights: [
        'State capital employment provides recession-resistant economic foundation',
        'University of Illinois Springfield drives student and young professional demand',
        'Memorial Medical Center and HSHS St. John\'s Hospital anchor healthcare sector',
        'Accessible wholesale prices with stable, predictable rental income',
      ],
    },
  },
  indiana: {
    indianapolis: {
      name: 'Indianapolis',
      state: 'Indiana',
      abbr: 'IN',
      description: 'Indianapolis is consistently rated as one of the top buy-and-hold real estate markets in the United States. A diversified economy — healthcare, logistics, tech, sports, and manufacturing — combined with landlord-friendly laws, low property taxes, and accessible wholesale prices creates an environment where rental properties can perform well for decades.',
      paragraph2: 'Neighborhoods like the Near East Side, Near Westside, Fountain Square, and parts of Lawrence and Southport offer consistent wholesale inventory with strong rental demand. Indianapolis\'s growing reputation among out-of-state investors has increased competition, but motivated seller deal flow remains healthy.',
      marketType: 'Top-rated buy-and-hold market',
      avgEntry: '$65,000–$175,000',
      neighborhoods: 'Near East Side, Fountain Square, Lawrence, Southport, Speedway',
      highlights: [
        'Consistently ranked in the top 5 markets for buy-and-hold rental investment',
        'Landlord-friendly laws make property management more predictable and profitable',
        'Low property taxes across Marion County reduce holding costs',
        'IU Health and Ascension St. Vincent anchor a major healthcare employment cluster',
      ],
    },
    'fort-wayne': {
      name: 'Fort Wayne',
      state: 'Indiana',
      abbr: 'IN',
      description: 'Fort Wayne is one of the most underrated wholesale markets in the Midwest. As Indiana\'s second-largest city, Fort Wayne offers a diversified manufacturing and healthcare economy, very accessible wholesale entry prices, and strong tenant demand from a large working-class population. Investors building cash-flowing rental portfolios find Fort Wayne\'s price-to-rent ratios consistently compelling.',
      paragraph2: 'The southeast and southwest quadrants of Fort Wayne offer consistent wholesale inventory at low acquisition costs. Parkview Health and Lutheran Health Network anchor a strong healthcare employment sector, while defense manufacturing at companies like Raytheon provides additional employment diversity.',
      marketType: 'High-yield, low-competition',
      avgEntry: '$50,000–$140,000',
      neighborhoods: 'Southeast Fort Wayne, Southwest Fort Wayne, New Haven, Huntertown, Leo',
      highlights: [
        'Very accessible wholesale entry prices with strong rental yield potential',
        'Parkview and Lutheran Health systems anchor major healthcare employment',
        'Low investor competition compared to Indianapolis',
        'Diversified manufacturing base provides employment stability',
      ],
    },
    'south-bend': {
      name: 'South Bend',
      state: 'Indiana',
      abbr: 'IN',
      description: 'South Bend\'s real estate market is anchored by the University of Notre Dame — one of the most recognized universities in the world — and a growing healthcare sector centered on Beacon Health System. The combination of university-driven rental demand and an affordable housing market creates strong investment fundamentals for buy-and-hold investors.',
      paragraph2: 'Neighborhoods surrounding Notre Dame, as well as the near northwest and south sides of South Bend, offer wholesale deals at very accessible entry points. Former Mayor Pete Buttigieg\'s downtown revitalization initiatives created momentum that continues to attract new residents and investment capital.',
      marketType: 'University-anchored, affordable',
      avgEntry: '$55,000–$150,000',
      neighborhoods: 'Near Northwest Side, Near South Side, Mishawaka, Granger, Elkhart',
      highlights: [
        'University of Notre Dame creates strong, consistent rental demand year-round',
        'Downtown revitalization attracting new residents and investment',
        'Very accessible wholesale entry prices relative to rental income',
        'Beacon Health System anchors healthcare employment beyond the university',
      ],
    },
    evansville: {
      name: 'Evansville',
      state: 'Indiana',
      abbr: 'IN',
      description: 'Evansville sits on the Indiana-Kentucky border and serves as a regional economic hub for the tri-state area. Healthcare anchored by Deaconess and Ascension St. Vincent, manufacturing, and the University of Southern Indiana create a diverse employment base. Wholesale investors find high yields, very low competition, and consistently available inventory.',
      paragraph2: 'The west and east sides of Evansville offer consistent wholesale deals at some of the lowest prices in the state. The city\'s position as a regional hub means it draws tenants from both Indiana and Kentucky, expanding the effective rental demand base beyond the city\'s own population.',
      marketType: 'Regional hub, high-yield',
      avgEntry: '$45,000–$130,000',
      neighborhoods: 'West Evansville, East Evansville, Newburgh, Boonville, Henderson KY',
      highlights: [
        'Deaconess and Ascension hospitals anchor strong healthcare employment',
        'Regional hub for the Indiana-Kentucky-Illinois tri-state area',
        'Very accessible wholesale prices with strong gross rental yields',
        'University of Southern Indiana adds student housing demand',
      ],
    },
  },
}

const STEPS = [
  { icon: Search, step: '01', title: 'Browse', description: 'Search verified wholesale deals filtered by location, deal type, price, and ARV.' },
  { icon: BarChart2, step: '02', title: 'Analyze', description: 'ARV estimates, spread, and property details are structured on every listing.' },
  { icon: MessageCircle, step: '03', title: 'Connect', description: 'Message verified sellers directly through our secure platform.' },
]

export async function generateStaticParams() {
  const params = []
  for (const state of Object.keys(CITY_DATA)) {
    for (const city of Object.keys(CITY_DATA[state])) {
      params.push({ state, city })
    }
  }
  return params
}

export async function generateMetadata({ params }) {
  const stateData = CITY_DATA[params.state]
  const cityData = stateData?.[params.city]
  if (!cityData) return {}
  return {
    title: `Wholesale Real Estate in ${cityData.name}, ${cityData.state} | DeelMap`,
    description: `Find verified wholesale real estate deals in ${cityData.name}, ${cityData.state}. Browse off-market investment properties with ARV data, connect directly with verified sellers.`,
    keywords: `wholesale real estate ${cityData.name.toLowerCase()}, wholesale properties ${cityData.name.toLowerCase()} ${cityData.state.toLowerCase()}, investment properties ${cityData.name.toLowerCase()}, off-market deals ${cityData.name.toLowerCase()}`,
  }
}

export default function CityPage({ params }) {
  const stateData = CITY_DATA[params.state]
  const data = stateData?.[params.city]

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 lg:px-[72px] py-20 text-center">
          <h1 className="text-3xl font-bold text-[#1A1816] mb-4">City not found</h1>
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
            Wholesale Real Estate Deals in {data.name}, {data.state}
          </h1>
          <p className="text-[16px] text-[#444441] leading-relaxed mb-8">
            Browse verified off-market wholesale properties in {data.name}. Every listing includes ARV, spread, and deal details. Every seller is identity-verified. Free for buyers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/marketplace?state=${data.abbr}`}
              className="h-12 px-8 bg-[#D03839] hover:bg-[#E0493B] text-white font-semibold rounded transition-colors flex items-center"
            >
              Browse {data.name} Deals
            </Link>
            <Link
              href={`/wholesale-real-estate/${params.state}`}
              className="h-12 px-8 border border-[#E8E8E4] text-[#444441] hover:border-[#1A1816] font-medium rounded transition-colors flex items-center"
            >
              All {data.state} deals
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
                The {data.name} wholesale market
              </h2>
              <div className="space-y-4">
                <p className="text-[16px] text-[#444441] leading-relaxed">{data.description}</p>
                <p className="text-[16px] text-[#444441] leading-relaxed">{data.paragraph2}</p>
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
                <p className="text-[11px] font-semibold text-[#737370] uppercase tracking-[1.5px] mb-1">Key Neighborhoods</p>
                <p className="text-[15px] text-[#444441]">{data.neighborhoods}</p>
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
