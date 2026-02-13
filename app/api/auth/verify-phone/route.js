// app/api/auth/verify-phone/route.js
import { NextResponse } from 'next/server'

// Numverify API keys (200 keys, 100 lookups each)
const NUMVERIFY_API_KEYS = [
  '4067eff82682c2209278093de8a3dd18',
  '3c8ce0b830a05a7d195fd441fab6cdcc',
  'b3068489c850aba22f2f3402daa06f14',
  '89341d39b1ae44292595d01868a53748',
  'fb7e9529e78677c728848b27acc9f7f6',
  'deb5216eafe35aa964adc12b48c233aa',
  '1c9faf1a0dc4ee5c14a5dc3cad449822',
  '5f655cd87c091cb4a346ee1380a7f86f',
  '76c987e85631398d945c365d77c9c2be',
  '9bacf71f8d09b7c5a03f65ca2af93be9',
  '4a8d1a6de0b2c16215d40590e8695db3',
  'ffbfb2771a4f81368f19e361f34f56cc',
  '00871efc9b42a90c6a3d4467f99fe6fa',
  'a466fc6dcc9092cac6314ce0f723d770',
  '8d9200dfae8ff407807a97117c98d03b',
  'a93824f840ca9b8b37e1e8170da40cf5',
  'b2d28d72da954800ba2986e48af341af',
  '4a47e3f335a71feb8082f2fe9828c216',
  '798dc35dab98c5af54cdf8327102375a',
  'd16846bc47c1e9bfd416ada6ffef3bd3',
  'b9fff0cee3fe3a3fcfde89f2b0c3119f',
  '905f0328eff5f13a877f9cf0e497f900',
  'ee21f6f043d506d215b893c18e09a6b7',
  '51b339b44cd606a291f5a38280ea1710',
  'f137bd09e13b6e772a131122f0844a3e',
  '9f46e0c0156eb05b365fb5d8453e53cd',
  'd65ede74798d3a71a7e93d0ba9e7d19f',
  '2c2addcbce7e4396507673a3ba5d21ed',
  'e0d87f3d202cf6ebaf39a8e817a9a854',
  'ef07861bd8bd0f9c245a10ef0407f2d3',
  'cdaf3338e6e7d7881284e9bd384e8027',
  'feaa758b88082fd46c5f94546bded9b2',
  '6dfe8584f25a5d9f53ef9b3496d8b2d7',
  '151a78f4544a515caf45a7144a189c05',
  '8a1b8ee94c03bc91f3cc155402746a36',
  'e7a5a8de78d5ec93db1502ebee378e0d',
  'c1106cf565ca2f7f5089dfb2399f136a',
  'e6927cddeee7fabdd4133f21f99883bb',
  '3f24972c97cec903c4f9fad8092df7f0',
  'b976f0d5f2d943668ee559c8f3d8ec70',
  '16fbb1cb969fcf33d2290fa2bd88a804',
  'd4d25805478914f0543b3df9b282d79c',
  '26d6f590ca4807f46dabec5d945540e5',
  '8871a6f502868d53706dae703c2fce3a',
  'aa076206622bccd0c748135ac991cd2e',
  '7ac8ac7baf43d12304efab43e4c580ed',
  '17c2400d9d5cda94f4e4b361ec77533c',
  'da26a8e322fc63096bdee271235f3c5f',
  'c9621c664068f9b16604c016557f1f76',
  'fe8d4c65fceb701e0aa32e50d229b206',
  'f755e57127ce1afec0c507a52fb53ba7',
  '7575b064e2e1890833ec83d145806d67',
  '330e0056ca1260793c732a65d3a69f25',
  '25198d6aaf84911df53008af1229f8fb',
  '71ae4ac524dffe57330254a786f535d7',
  'e583e0a29c2e1ee8d539d45d0adab92f',
  '884a134509872d7883b98423833b1f90',
  '1fb2bc6ddab61488374075626dea1525',
  'e4ef58f3f684c449b0bb2f7bfd66bcbd',
  '5b0822947df3806e42e0dc53431d7c9f',
  'b98011d583732cc7c64c5f284d2dd2ed',
  'a764be4386e4fdb791429f6ff40b3e34',
  'a8a6dae070bf1469e95fddec0f7f488f',
  'f9fe617a086b43738eeddd085add6429',
  '39f66db6b59ba92dc2cfe8750fdc8ed0',
  '53c906bc17a9823026890c7739d633ee',
  'cb7c8e36907aaefc3715ac980975a39a',
  '60868226acbad828ec2c6b6c3c4195fc',
  'd82693514c15156c526a28aa3442fdef',
  'a34d5cfd79849965a4f2be97c0644a97',
  '27093fb0ed2ebaa1fd8ebc9495bcbb82',
  'e9d9c90d23bbbfd1260611ae76497397',
  '160b09a728ff749ceba51d1dbf897b7f',
  '234732e5975f0f9a9db18e50bbeabbd3',
  '97359f64ff3cde43b38191c43a13cfd8',
  '0a527eedc6b66617d6850509a9b94385',
  '4f41aabc6cca771ffc6d6cd313f56d6f',
  '084fe4e2d826d0d069ddbb07e9f5e223',
  '932ad0e34da62db195f9a2ab4b3a0b1d',
  '73644eeabccc040a24623ab4bfd563e9',
  '5be4655591f65ce6f9f95f66b8edf444',
  '5681b78299864e2d52a8e7590ad0658c',
  '993a66bf6283267e96d0383f62361e3c',
  '7b7edc90c7a8ea81519cfda532ef9b60',
  '15fa0f047ec3ab58ef258ff971260e7c',
  '1605d7cbb399b7e5903c00e63fedb507',
  '92466ed99cface914b33b5db0503fb71',
  'cc493d15b0b16c038b46b7355a2d2886',
  'f41643ee22fb481285042e30b9074b96',
  'c895078179f2d20358ae53ebdadd142d',
  '9d49c336f5438532cac9cdbac6995e3a',
  '6bcd17a3288f5400aa6ad1a2165bbd44',
  '3366e86533e59ad6c7d988fea28b3d1b',
  'db101264b2233d503c61a8de2d06e72a',
  '3829ae2ee8d434adb8bbc832d4576d42',
  '5db693e8a1bd1b1d8be81901c0dcea21',
  'a0b833ef62c315fb4e3b5695560cc11f',
  '095d13784db77a2130829d434f0561ac',
  '20dfe5afbce1c0aeb4f8972cb726c5c0',
  'ab181c07f26a409d1539ed04359664dc',
  'df7ad9dba768a276b9eb4d71be44845b',
  '6e092c0dcc694358158f511cce163316',
  'c076336f125764201aa47adf0c4f4273',
  '9faef5ffdfa02fdf2cb5c2297ad56891',
  '9c805b3a5585db6d5e3ea8e7e28ee845',
  '8bd92f4eaf66bd230744665b2a460b4f',
  'c255e48f6c51b4785530e43c660bce92',
  '64fddff37e2c5dbd91c2816b4e0a620a',
  '8f4877db4857528e3d0dca66203b5d35',
  '270a07f345e4dc05997a7cf142f74cb9',
  '354d13ae7f6b88d7e390de90ae2adc0a',
  '72e2ad286dddefd834634116d2f65ad4',
  '2abb4c7566f289f7d8fbeb6c9f9b7e35',
  '654d31e414ab0ed770cf050fcd2e4169',
  '795536ea153b9fc314af9bfb9705a036',
  '9bba5b437eb7dac8ba27b4890b45badc',
  '6f1c1ebfa52a40c453101bbc1161f425',
  'fd87732e0d280e352b22582ede3fe1cd',
  '13f14f8c3633d0b2bef9ea716a271bce',
  '284f189afe2f395793ce925c5ad8611d',
  'e3a35c7440e19486d61f1258f58e914a',
  '7186eac063649aaeaad665d12292d462',
  'd07f171ae16f307c36565a38d81c283a',
  '2417e3a4167c50db0e502ff6920b4dfd',
  '22b0df5ffefae77de1ca7da2b28dbb77',
  'd5ae9542c55a80f68c0ff8f61f16460e',
  '4e00fc69478c93fb076a8776fd1da806',
  '57ad72e80c44f8bd4b3de6b17da35014',
  'fff2fbe8ca9c27304c01b655545aecb8',
  '4018aa3bde9036d06002f1e425038549',
  'f2ee70b27cd65f8e610f265a025f82de',
  '2c56b178592bf87502996b5f189ca5b3',
  '6564d405be58c62038f2036e336bc484',
  '43c43c287e708396d6f22c7f4cc3051a',
  '3d10577fe596209f167b2130a6a23256',
  '1565400f816d71ad49de8bea40d0fbcc',
  'fce4dcac5269a767776b07fce05e9063',
  '4a6c99b0a05ad918032c0e6e4e40db93',
  '2cc14e81648bc2e128fdc094faf8a83f',
  '02e960cd7a6c838ec510d099c09e586d',
  '30d0eed78fd96abebfdc03717b30515e',
  '20433a13556fbb6a4b51ee6e0e4c6236',
  'fde619ce6556870f41851982496f1ee3',
  'c77aeed1755e0003111b1c608e37d3e2',
  'a761dcee5b09201ab0a160e0de5d430b',
  'dec0f04591b5bcfe8de912b6628f2171',
  '83aae71d5a74c567f2c5fcc4ba6292aa',
  '2bae73131565c96de9f09f8aac4e5216',
  'e745c89a3b4bb88f027d61c86ea84302',
  'ae899c51cb26ac26dd1438c9c1f6e3f3',
  '1008967d4f4c1142a84acc8370340ac9',
  '140caf2d573d2fc1f337e945b0285a56',
  'dd8071c4033af35d3ef319056e327b93',
  '3c9cedecf9f17441a9ddb838644d0414',
  'addb0bc36e865e950ba7f434454fbbc8',
  '806b24cc21f5a53e35187f879668c547',
  'b034fed8810c911268832e44ca251930',
  '0e494130e3e361867248aa83a669ecf8',
  '5ef616cd37d5c068c333bd810f1acbfb',
  '12eae41d4535bcf7e8e5f4a8428f0e69',
  '4fd0e065790e9c8c12563a1b4bd615e8',
  'ccd0fa5392baadd860a68ab75c052b1f',
  '9606b4a4978d87af9d98521623af2b16',
  'e56da919c282254e0eb30a016975c25c',
  '2121788c78316f6d04f0163d1aca3f80',
  '12140f6748966a3c35da5c17e8ae7804',
  'f20d27b58daed0e32c6ab84a0776193d',
  '3f345ff49deed9a4f1039066c9ffad34',
  'de288e0fdc64d75818cef83a28e059fa',
  '3d4d9501d879787764e9626977ebbc1e',
  '1b1fa19c280d18f95450f183f8851b59',
  '75ef1bc95a4ecf8c0b5703d3a6972b30',
  '7fc2727ffa91dc0858145ae296bb590c',
  '1788fee0210029c3b3f3cb0edb461362',
  'c2411d73a03e7bf8f8861f9eb7ab82c5',
  'c7f56e64a5a81287ecbeb206885d4936',
  'd01754569b48ad0d41892fee17494e3a',
  'b121a0b7bb1b9fd2a30618303ca0bce6',
  'a2ac7b824011f60037b30824a6e89323',
  'cfb2e50f3c996d99806e4d71d650d915',
  '9eb3d7945992e4ca60c1ca76d0d25d09',
  'ce633f514d7471a5c75de3e95ea1d58f',
  '3353bf281ddbdcc14f27db4fb98acd3f',
  '124b4d9319b87c86b6b9894936fc77fe',
  'cc8dd0e7f7fb3e21b190128146b619fc',
  'abf1946275e569a3a7613f7f61715253',
  '8e400fcb313ed06c04c25eacf31bffd5',
  'dcd5a9ae80ab07e4fd0d8e49afc4edf8',
  'f8268d0410c6bfc56559d9e5637d32c8',
  'f816f17804532cd8db8f72ab2dfe6094',
  '6e3ad0b46fdb1370253c81bc84375c02',
  'b46a6c789a41b27b47e7132fd9d53fcc',
  'e5eeac144cd429ead556d15b70c0b92a',
  'f540fa55707e04d11072cc2707cebe59',
  '2d0c3a87bf3ccd52d9720197dea0f874',
  '737b75085f31c2afd1a33a12b5d12812',
  '668ac753c360e754d294b644359bb817',
  'd9a9898351359cd2029b94851f13c403',
  '363b222b7bd039014dee0f4ab6806cc5',
  '418874b0b633cfcbeb503e54447a25a4',
  'cfee5bee733f7baa4e5a7460150492ad',
  '6d58b992101dec2319c4abb1b24a4dbf'
]

// Track current key index (in production, use Redis or database)
let currentKeyIndex = 0

async function verifyWithNumverify(phone, keyIndex = 0) {
  if (keyIndex >= NUMVERIFY_API_KEYS.length) {
    console.error('All Numverify API keys exhausted')
    return { success: false, error: 'Service temporarily unavailable' }
  }

  const apiKey = NUMVERIFY_API_KEYS[keyIndex]
  const url = `http://apilayer.net/api/validate?access_key=${apiKey}&number=${phone}&country_code=US&format=1`

  console.log('\n========== NUMVERIFY API CALL ==========')
  console.log('Phone number:', phone)
  console.log('Using API key index:', keyIndex)
  console.log('API URL:', url.replace(apiKey, 'HIDDEN_KEY'))

  try {
    const response = await fetch(url)
    const data = await response.json()

    console.log('\n---------- NUMVERIFY RESPONSE ----------')
    console.log('Full response:', JSON.stringify(data, null, 2))
    console.log('----------------------------------------\n')

    // Check if API key has no credits left
    if (data.error && (data.error.code === 104 || data.error.info?.includes('monthly'))) {
      console.log(`API key ${keyIndex} exhausted, trying next...`)
      currentKeyIndex = keyIndex + 1
      return verifyWithNumverify(phone, keyIndex + 1)
    }

    if (data.error) {
      console.error('Numverify API error:', data.error)
      return { success: false, error: data.error.info || 'Validation failed' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Numverify fetch error:', error)
    // Try next key on network error
    return verifyWithNumverify(phone, keyIndex + 1)
  }
}

export async function POST(request) {
  try {
    const { phone } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { valid: false, message: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean the phone number - remove all non-digits
    const cleanedPhone = phone.replace(/\D/g, '')

    // Basic validation for US numbers (10 digits without country code)
    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid 10-digit US phone number' },
        { status: 400 }
      )
    }

    // Check for obviously invalid patterns
    const areaCode = cleanedPhone.slice(0, 3)
    const exchange = cleanedPhone.slice(3, 6)

    // Reject all same digits (0000000000, 1111111111, etc.)
    if (/^(\d)\1{9}$/.test(cleanedPhone)) {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // Reject sequential numbers (1234567890, 0123456789)
    if (cleanedPhone === '1234567890' || cleanedPhone === '0123456789') {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // US area codes cannot start with 0 or 1
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid area code. US area codes cannot start with 0 or 1' },
        { status: 400 }
      )
    }

    // Exchange (next 3 digits) cannot start with 0 or 1
    if (exchange.startsWith('0') || exchange.startsWith('1')) {
      return NextResponse.json(
        { valid: false, message: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Reject fake test numbers (555-0100 to 555-0199 are reserved for fiction)
    if (exchange === '555' && cleanedPhone.slice(6, 8) === '01') {
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    // Format with country code for Numverify (needs full international format)
    const formattedPhone = `1${cleanedPhone}`

    // Call Numverify API
    const result = await verifyWithNumverify(formattedPhone, currentKeyIndex)

    if (!result.success) {
      return NextResponse.json(
        { valid: false, message: result.error || 'Phone verification service unavailable' },
        { status: 500 }
      )
    }

    const data = result.data

    // Check if the number is valid
    if (!data.valid) {
      console.log('❌ PHONE INVALID - Numverify says invalid')
      console.log('Returning: { valid: false, message: "This phone number appears to be invalid..." }')
      return NextResponse.json(
        { valid: false, message: 'This phone number appears to be invalid. Please enter a valid US phone number.' },
        { status: 400 }
      )
    }

    // Additional check - ensure it's a US number
    if (data.country_code !== 'US') {
      console.log('❌ PHONE INVALID - Not a US number, country_code:', data.country_code)
      return NextResponse.json(
        { valid: false, message: 'Please enter a valid US phone number' },
        { status: 400 }
      )
    }

    // Number is valid
    const response = {
      valid: true,
      message: 'Phone number verified',
      lineType: data.line_type || 'unknown',
      carrier: data.carrier || 'Unknown',
      location: data.location || ''
    }
    console.log('✅ PHONE VALID - Returning:', JSON.stringify(response, null, 2))
    return NextResponse.json(response)

  } catch (error) {
    console.error('Phone verification error:', error)
    return NextResponse.json(
      { valid: false, message: 'Phone verification service temporarily unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
