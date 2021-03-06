const {
  months,
  nakshatras,
  pakshNames,
  tithiNames,
  weekdays,
} = require( './consts' )
const {
  decimalToAngle,
  formatEnglishDate,
  fractionToTime,
  toGurmukhiNum,
} = require( './utils' )

// Import Calendrica 4.0
const {
  astronomy: {
    universalFromLocal,
    standardFromUniversal,
    universalFromStandard,
    localFromStandard,
    lunarPhase,
  },
  general: { mod, dayOfWeekFromFixed, jdFromFixed, unixFromMoment },
  gregorian: { gregorianFromFixed },
  julian: { julianFromFixed },
  modernHindu: {
    HINDU_LOCATION,
    hinduDayCount,
    hinduLunarPhase,
    altHinduSunrise,
    hinduSolarFromFixed,
    fixedFromHinduSolar,
    fixedFromHinduFullmoon,
    ayanamsha,
    astroHinduSunset,
    astroHinduSolarFromFixed,
    fixedFromAstroHinduSolar,
    hinduLunarStation,
    fixedFromAstroHinduFullmoon,
    hinduSolarLongitudeAtOrAfter,
    astroHinduSolarLongitudeAtOrAfter,
    hinduLunarDayAtOrAfter,
    astroHinduLunarDayAtOrAfter,
    astroHinduLunarStation,
  },
} = require( './calendrica' )

/**
 * Converts Bikrami Lunar Date into the Gregorian Calendar
 * @param {!number} year Bikrami Year
 * @param {!number} month Bikrami Month
 * @param {!number} date Bikrami Tithi
 * @param {Object} [options={ astro: true }]
 * `[astro=true]` - Set to `false` to use Surya Sidhantta instead of Drik Gannit<br>
 * `[paksh]` - Lunar Paksh. Default is Sudi, `true` for Vadi.<br>
 * `[leapMonth]` - Set to `true` if the month is Adhika Month (Mal Maas)<br>
 * `[leapDay]` - Set to `true` if the lunar day spans more than 1 solar day
 * @return {Object} Gregorian Date
 * @example findDateFromBikramiLunar( 1723, 10, 7 )
 */
function findDateFromBikramiLunar(
  year, month, date, { astro, paksh, leapMonth, leapDay } = {
    astro: true, leapMonth: false, leapDay: false,
  },
) {
  // Add 15 Days if Vadi (New Moon) Paksh
  const day = paksh ? date + 15 : date
  const pakshName = paksh ? pakshNames.vadi : pakshNames.sudi

  // Calculate RD from Tithi
  const fixedDay = astro
    ? fixedFromAstroHinduFullmoon( year, month, leapMonth, day, leapDay )
    : fixedFromHinduFullmoon( year, month, leapMonth, day, leapDay )

  // Get Weekday
  const weekday = dayOfWeekFromFixed( fixedDay )

  // Get Gregorian Date from R.D.
  const { year: gYear, month: gMonth, day: gDay } = gregorianFromFixed( fixedDay )

  // Sunrise Time
  const sunrise = altHinduSunrise( fixedDay )

  // Add Leap Month Prefix to Month Name
  const lunarMonthName = {
    pa: leapMonth === true
      ? `${pakshNames.leap.pa}-${months[ month - 1 ].pa}`
      : months[ month - 1 ].pa,
    en: leapMonth === true
      ? `${pakshNames.leap.en}-${months[ month - 1 ].en}`
      : months[ month - 1 ].en,
  }

  // Tithi Time
  const tithiStart = astro
    ? astroHinduLunarDayAtOrAfter( day, ( fixedDay - 2 ) )
    : universalFromLocal( hinduLunarDayAtOrAfter( day, ( fixedDay - 2 ) ), HINDU_LOCATION )
  const tithiEnd = astro
    ? astroHinduLunarDayAtOrAfter( day + 1, ( fixedDay - 1 ) )
    : universalFromLocal(
      hinduLunarDayAtOrAfter( day + 1, ( fixedDay - 1 ) ),
      HINDU_LOCATION,
    )

  // Calculate Solar Date
  const { year: solarYear, month: solarMonth, day: solarDay } = astro
    ? astroHinduSolarFromFixed( fixedDay )
    : hinduSolarFromFixed( fixedDay )

  // Sangrand
  const sangrand = astro
    ? fixedFromAstroHinduSolar( solarYear, solarMonth, 1 )
    : fixedFromHinduSolar( solarYear, solarMonth, 1 )
  const sangrandDate = gregorianFromFixed( sangrand )

  // Sankranti Time
  const sankranti = astro
    ? astroHinduSolarLongitudeAtOrAfter( ( ( solarMonth - 1 ) * 30 ), ( sangrand - 2 ) )
    : universalFromLocal(
      hinduSolarLongitudeAtOrAfter( ( ( solarMonth - 1 ) * 30 ), ( sangrand - 2 ) ),
      HINDU_LOCATION,
    )

  // Lunar Date Obj
  const lunarDate = {
    tithiName: ( date === 15 && paksh === true ) ? tithiNames[ 15 ] : tithiNames[ date - 1 ],
    leapMonth,
    leapDay,
    englishDate: {
      month,
      monthName: lunarMonthName.en,
      paksh: pakshName.en,
      tithi: date,
      year,
    },
    punjabiDate: {
      month: toGurmukhiNum( month ),
      monthName: lunarMonthName.pa,
      paksh: pakshName.pa,
      tithi: toGurmukhiNum( date ),
      year: toGurmukhiNum( year ),
    },
    nakshatra: nakshatras[ ( astro
      ? astroHinduLunarStation( fixedDay )
      : hinduLunarStation( localFromStandard( fixedDay, HINDU_LOCATION ) ) ) - 1 ],
    tithiFraction: mod( astro
      ? ( lunarPhase( universalFromStandard( sunrise, HINDU_LOCATION ) ) / 12 )
      : ( hinduLunarPhase( localFromStandard( sunrise, HINDU_LOCATION ) ) / 12 ), 1 ),
    timing: {
      start: {
        gregorianDate: new Date( unixFromMoment( tithiStart ) * 1000 ),
        time: `${fractionToTime( standardFromUniversal( tithiStart, HINDU_LOCATION ) )} IST`,
      },
      end: {
        gregorianDate: new Date( unixFromMoment( tithiEnd ) * 1000 ),
        time: `${fractionToTime( standardFromUniversal( tithiEnd, HINDU_LOCATION ) )} IST`,
      },
    },
  }

  // Solar Date Obj
  const solarDate = {
    englishDate: {
      month: solarMonth,
      monthName: months[ solarMonth % 12 ].en,
      date: solarDay,
      year: solarYear,
      day: weekdays[ weekday ].en,
    },
    punjabiDate: {
      month: toGurmukhiNum( solarMonth ),
      monthName: months[ solarMonth % 12 ].pa,
      date: toGurmukhiNum( solarDay ),
      year: toGurmukhiNum( solarYear ),
      day: weekdays[ weekday ].pa,
    },
    sangrand: {
      gregorianDate: new Date( sangrandDate.year, sangrandDate.month - 1, sangrandDate.day ),
      sankranti: {
        gregorianDate: new Date( unixFromMoment( sankranti ) * 1000 ),
        time: `${fractionToTime( standardFromUniversal( sankranti, HINDU_LOCATION ) )} IST`,
      },
    },
  }

  if ( astro ) {
    // Include ayanamsha if using Drik
    const ayanamshaDeg = ayanamsha( fixedDay )
    solarDate.ayanamsha = {
      decimal: ayanamshaDeg,
      dms: decimalToAngle( ayanamshaDeg ),
    }
  }

  // Return Bikrami Obj
  const bikramiDate = {
    gregorianDate: new Date( gYear, gMonth - 1, gDay ),
    julianDay: jdFromFixed( fixedDay ),
    ahargana: hinduDayCount( fixedDay ),
    lunarDate,
    solarDate,
    sunriseTime: `${fractionToTime( sunrise )} IST`,
    sunsetTime: `${fractionToTime( astroHinduSunset( fixedDay ) )} IST`,
    kaliYear: year + 3044,
    sakaYear: year - 135,
  }

  // Add Julian Dates if before Sept. 14, 1752 C.E.
  if ( fixedDay < 639797 ) {
    bikramiDate.julianDate = formatEnglishDate( julianFromFixed( fixedDay ) )
    bikramiDate.solarDate.sangrand.julianDate = formatEnglishDate( julianFromFixed( sangrand ) )
    bikramiDate.solarDate.sangrand.sankranti.julianDate = formatEnglishDate(
      julianFromFixed( Math.floor( standardFromUniversal( sankranti, HINDU_LOCATION ) ) ),
    )
    bikramiDate.lunarDate.timing.start.julianDate = formatEnglishDate(
      julianFromFixed( Math.floor( standardFromUniversal( tithiStart, HINDU_LOCATION ) ) ),
    )
    bikramiDate.lunarDate.timing.end.julianDate = formatEnglishDate(
      julianFromFixed( Math.floor( standardFromUniversal( tithiEnd, HINDU_LOCATION ) ) ),
    )
  }

  // Check if before 535 N.S. and add year
  if ( fixedDay < 731288 ) {
    bikramiDate.nanakshahiYear = solarMonth === 12
      ? solarYear - 1524
      : solarYear - 1525
  }

  return bikramiDate
}

module.exports = findDateFromBikramiLunar
