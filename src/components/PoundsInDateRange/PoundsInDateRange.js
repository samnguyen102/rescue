import { Text } from '@sharingexcess/designsystem'
import React, { useCallback, useState, useEffect } from 'react'
import { getDefaultRangeStart, getDefaultRangeEnd } from './utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useFirestore } from 'hooks'
import { calculateCategoryRatios, formatLargeNumber } from 'helpers'

const categories = [
  'bakery',
  'dairy',
  'meat/Fish',
  'mixed groceries',
  'non-perishable',
  'prepared/Frozen',
  'produce',
  'other',
]
const retailValues = {
  bakery: 2.36,
  dairy: 1.28,
  'meat/Fish': 4.4,
  'mixed groceries': 2.31,
  'non-perishable': 3.19,
  'prepared/Frozen': 4.13,
  produce: 1.57,
  other: 2.31,
}
const fairMarketValues = {
  bakery: 2.14,
  dairy: 1.42,
  'meat/Fish': 2.77,
  'mixed groceries': 1.62,
  'non-perishable': 2.13,
  'prepared/Frozen': 2.17,
  produce: 1.13,
  other: 1.62,
}

export function PoundsInDateRange() {
  const [rangeStart, setRangeStart] = useState(getDefaultRangeStart())
  const [rangeEnd, setRangeEnd] = useState(getDefaultRangeEnd())
  const [retailValue, setRetailValue] = useState(0)
  const [fairMarketValue, setFairMarketValue] = useState(0)
  const [poundsInRange, setPoundsInRange] = useState(0)
  const [categoryRatios, setCategoryRatios] = useState(0)

  const routesOriginal = useFirestore(
    'routes',
    useCallback(r => r.status === 9, [])
  )
  const [routes, setRoutes] = useState(routesOriginal)

  const deliveries = useFirestore(
    'deliveries',
    useCallback(delivery => delivery.status === 9 && delivery.report, [])
  )

  const pickups = useFirestore(
    'pickups',
    useCallback(pickup => pickup.status === 9 && pickup.report, [])
  )

  useEffect(() => {
    if (rangeStart && rangeEnd) {
      setRoutes(
        routesOriginal.filter(
          r =>
            new Date(r.time_start) > new Date(rangeStart) &&
            new Date(r.time_start) < new Date(rangeEnd)
        )
      )
    } else {
      setRoutes(routesOriginal)
    }
  }, [routesOriginal, rangeStart, rangeEnd])

  useEffect(() => {
    function generatePoundsInRange() {
      let total_weight = 0
      routes.forEach(r => {
        deliveries.forEach(d => {
          if (d.route_id === r.id) {
            total_weight += d.report.weight
          }
        })
      })
      return total_weight
    }

    if (deliveries.length) {
      setPoundsInRange(generatePoundsInRange())
    }
  }, [routes, deliveries, poundsInRange, categoryRatios])

  useEffect(() => {
    if (pickups.length) {
      setCategoryRatios(calculateCategoryRatios(pickups))
    }
  }, [pickups])

  useEffect(() => {
    let totalRetail = 0
    let totalFairMarket = 0
    for (const category of categories) {
      const categoryWeight = poundsInRange * categoryRatios[category]
      const categoryRetailValue = categoryWeight * retailValues[category]
      const categoryFairMarketValue =
        categoryWeight * fairMarketValues[category]
      totalRetail += categoryRetailValue
      totalFairMarket += categoryFairMarketValue
    }
    setRetailValue(totalRetail)
    setFairMarketValue(totalFairMarket)
  }, [poundsInRange, categoryRatios])

  function findTotalWeight(a, type, i) {
    if (i <= 0) return 0
    return findTotalWeight(a, type, i - 1) + a[i - 1].report[type]
  }

  const bakeryTotal = findTotalWeight(pickups, 'bakery', pickups.length)

  const dairyTotal = findTotalWeight(pickups, 'dairy', pickups.length)

  const meatTotal = findTotalWeight(pickups, 'meat/Fish', pickups.length)
  const mixedGroceriesTotal = findTotalWeight(
    pickups,
    'mixed Groceries',
    pickups.length
  )
  const nonPerishablesTotal = findTotalWeight(
    pickups,
    'non-perishable',
    pickups.length
  )

  const preparedTotal = findTotalWeight(
    pickups,
    'prepared/Frozen',
    pickups.length
  )
  // pickups.reduce((total, p) => total + p.report.produce, 0)
  const produceTotal = findTotalWeight(pickups, 'produce', pickups.length)

  const otherTotal = findTotalWeight(pickups, 'other', pickups.length)

  const graphData = [
    {
      name: 'Produce',
      value: produceTotal,
    },
    {
      name: 'Bakery',
      value: bakeryTotal,
    },
    {
      name: 'Meat',
      value: meatTotal,
    },
    {
      name: 'Mixed',
      value: mixedGroceriesTotal,
    },
    {
      name: 'Prepared',
      value: preparedTotal,
    },
    {
      name: 'Dairy',
      value: dairyTotal,
    },
    {
      name: 'Non-persihable ',
      value: nonPerishablesTotal,
    },
    {
      name: 'Other',
      value: otherTotal,
    },
  ]

  return (
    <main id="PoundsInDateRange">
      <div class="canvas">
        <div class="header">
          <Text type="paragraph" color="black">
            Pounds In Date Range ...
          </Text>
        </div>

        <div class="InputSection">
          <div class="Input">
            <label class="focused">From...</label>
            <input
              type="datetime-local"
              value={rangeStart}
              onChange={e => setRangeStart(e.target.value)}
            ></input>
          </div>
          <div class="Input">
            <label class="focused">To...</label>
            <input
              type="datetime-local"
              value={rangeEnd}
              onChange={e => setRangeEnd(e.target.value)}
            ></input>
          </div>
        </div>
        <div class="pounds">
          <Text type="secondary-header" color="green">
            {formatLargeNumber(poundsInRange)} lbs.
          </Text>
        </div>
        <div class="details">
          <Text type="small">
            {formatLargeNumber(poundsInRange * 3.66)} lbs. &nbsp; Emmisions
            Reduced in Pounds
          </Text>

          <Text type="small">
            ${formatLargeNumber(retailValue)}
            &nbsp; Retail Value
          </Text>

          <Text type="small">
            ${formatLargeNumber(fairMarketValue)}
            &nbsp; Fair Market Value
          </Text>
        </div>
        <div class="graph">
          <ResponsiveContainer width="95%" height={300}>
            <BarChart
              width={300}
              height={300}
              data={graphData}
              margin={{ top: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" scaleToFit={true} interval={0} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="var(--primary)" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}
