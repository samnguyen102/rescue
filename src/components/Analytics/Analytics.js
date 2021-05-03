import React, { useState } from 'react'
import useDeliveryData from '../../hooks/useDeliveryData'
import useRouteData from '../../hooks/useRouteData'
import useUserData from '../../hooks/useUserData'
import usePickupData from '../../hooks/usePickupData'
import useOrganizationData from '../../hooks/useOrganizationData'
import Header from '../Header/Header'
import { Input } from '../Input/Input'
import './Analytics.scss'
import moment from 'moment'

export default function Analytics() {
  const [tab, setTab] = useState('RouteAnalytics')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [driverNameFilter, setDriverNameFilter] = useState('')
  const drivers = useUserData(
    driverNameFilter !== ''
      ? driver =>
          driver.name.toLowerCase().includes(driverNameFilter.toLowerCase())
      : driver => driver
  )
  const orgs = useOrganizationData()
  const routes = useRouteData(
    rangeStart && rangeEnd
      ? r =>
          r.status === 9 &&
          new Date(r.time_start) > new Date(rangeStart) &&
          new Date(r.time_start) < new Date(rangeEnd)
      : r => r.status === 9
  )
  const deliveries = useDeliveryData(r => r.status === 9 && r.report)
  const pickups = usePickupData(r => r.status === 9 && r.report)
  const [filterType, setFilterType] = useState('dateFilter')

  function sortByRoutes(array) {
    return array.sort((a, b) =>
      routes.filter(r => r.driver_id === a.id) >
      routes.filter(r => r.driver_id === b.id)
        ? -1
        : 1
    )
  }

  function calculateAllWeights(org) {
    return [
      ...pickups.filter(p => p.org_id === org.id && p.status === 9),
      ...deliveries.filter(d => d.org_id === org.id && d.status === 9),
    ]
      .map(stop => stop.report.weight || 0)
      .reduce((a, b) => a + b, 0)
  }

  function sortByWeight(array) {
    return array.sort((a, b) =>
      calculateAllWeights(a) > calculateAllWeights(b) ? -1 : 1
    )
  }

  function capitalize(s) {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  function RouteAnalytics() {
    return (
      <table className="Analytics__Route">
        <thead>
          <tr>
            <td>Driver</td>
            <td>Timeline</td>
            <td>Pickups</td>
            <td>Deliveries</td>
            <td>Weight - Mileage</td>
          </tr>
        </thead>
        <tbody>
          {routes.map(r => {
            const r_driver = drivers.find(d => d.id === r.driver_id)
            if (!r_driver) {
              return null
            }
            const r_timestart = r.time_start
            const r_timeend = r.time_end
            const r_pickups = pickups.filter(p => p.route_id === r.id)
            const r_deliveries = deliveries.filter(de => de.route_id === r.id)
            console.log(r)
            const r_weight = r_deliveries
              .map(de => de.report.weight || 0)
              .reduce((a, b) => a + b, 0)
            // Todo: inspect time_finished and diplay correctly
            return (
              <tr key={r.id}>
                <td id="driver">{r_driver.name}</td>
                <td id="timeline">
                  {moment(r_timestart).format('MM-DD-YYYY')} <br></br>
                  {moment(r_timestart).format('h:mma')} -{' '}
                  {moment(r_timeend).format('h:mma')}{' '}
                </td>
                <td>
                  <ul>
                    {r_pickups.map(p => (
                      <li>
                        {' - '}
                        {p.location_id
                          .split('_')
                          .map(p_name => capitalize(p_name) + ' ')}
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {r_deliveries.map(p => (
                      <li>
                        {' - '}
                        {p.location_id
                          .split('_')
                          .map(p_name => capitalize(p_name) + ' ')}
                      </li>
                    ))}
                  </ul>
                </td>
                <td id="weight">{r_weight} lbs</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  function DriverAnalytics() {
    return (
      <table>
        <thead>
          <tr>
            <td>Driver</td>
            <td>Routes</td>
            <td>Pickups</td>
            <td>Deliveries</td>
            <td>Total Weight</td>
          </tr>
        </thead>
        <tbody>
          {sortByRoutes(drivers).map(dr => {
            const dr_routes = routes.filter(
              r => r.driver_id === dr.id && r.status === 9
            )
            const dr_pickups = pickups.filter(p =>
              dr_routes.map(r => r.id).includes(p.route_id)
            )
            const dr_deliveries = deliveries.filter(de =>
              dr_routes.map(r => r.id).includes(de.route_id)
            )
            const dr_weight = dr_deliveries
              .map(de => de.report.weight || 0)
              .reduce((a, b) => a + b, 0)
            return (
              <tr key={dr.id}>
                <td>{dr.name}</td>
                <td>{dr_routes.length}</td>
                <td>{dr_pickups.length}</td>
                <td>{dr_deliveries.length}</td>
                <td>{dr_weight}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  function OrgAnalytics() {
    const [filter, setFilter] = useState('all')

    function filterByType(orgs) {
      if (filter === 'donor') {
        return orgs.filter(o => o.org_type === 'donor')
      } else if (filter === 'recipient') {
        return orgs.filter(o => o.org_type === 'recipient')
      } else return orgs
    }
    return (
      <>
        <section id="Filters">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">View{filter === 'all' ? 'ing' : ''} All</option>
            <option value="donor">
              View{filter === 'donor' ? 'ing' : ''} Donors
            </option>
            <option value="recipient">
              View{filter === 'recipient' ? 'ing' : ''} Recipients
            </option>
          </select>
        </section>
        <table>
          <thead>
            <tr>
              <td>Organization</td>
              <td>Type</td>
              <td>Pickups</td>
              <td>Deliveries</td>
              <td>Total Weight</td>
            </tr>
          </thead>
          <tbody>
            {sortByWeight(filterByType(orgs)).map(org => {
              const org_pickups = pickups.filter(
                p => p.org_id === org.id && p.status === 9
              )
              const org_deliveries = deliveries.filter(
                de => de.org_id === org.id && de.status === 9
              )
              // const org_weight = org_deliveries
              //   .map(de => de.report.weight || 0)
              //   .reduce((a, b) => a + b, 0)
              return (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.org_type}</td>
                  <td>{org_pickups.length}</td>
                  <td>{org_deliveries.length}</td>
                  <td>{calculateAllWeights(org)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </>
    )
  }

  function ActiveTab() {
    switch (tab) {
      case 'RouteAnalytics':
        return <RouteAnalytics />
      case 'DriverAnalytics':
        return <DriverAnalytics />
      case 'OrgAnalytics':
        return <OrgAnalytics />
      default:
        return null
    }
  }

  return (
    <main id="Analytics">
      <Header text="Analytics" />
      <section id="Tabs">
        <button
          className={tab === 'RouteAnalytics' ? 'active' : 'inactive'}
          onClick={() => setTab('RouteAnalytics')}
        >
          Routes
        </button>
        <button
          className={tab === 'DriverAnalytics' ? 'active' : 'inactive'}
          onClick={() => setTab('DriverAnalytics')}
        >
          Drivers
        </button>
        <button
          className={tab === 'OrgAnalytics' ? 'active' : 'inactive'}
          onClick={() => {
            setTab('OrgAnalytics')
            setFilterType('dateFilter')
          }}
        >
          Organizations
        </button>
      </section>

      {tab !== 'OrgAnalytics' && (
        <section id="FilterOptions">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="dateFilter">Date Filter</option>(
            <option value="driverFilter">Driver Filter</option>)
          </select>
        </section>
      )}

      {filterType === 'dateFilter' && (
        <section id="DateRanges">
          <Input
            type="datetime-local"
            label="From..."
            value={rangeStart}
            onChange={e => setRangeStart(e.target.value)}
          />
          <Input
            type="datetime-local"
            label="To..."
            value={rangeEnd}
            onChange={e => setRangeEnd(e.target.value)}
          />
        </section>
      )}
      {filterType === 'driverFilter' && tab !== 'OrgAnalytics' && (
        <section id="DriverName">
          <Input
            type="text"
            label="Driver's name"
            value={driverNameFilter}
            onChange={e => setDriverNameFilter(e.target.value)}
          />
        </section>
      )}
      <ActiveTab />
    </main>
  )
}
