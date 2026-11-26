const express = require('express')
const router = express.Router()
const db = require('../config/db')

// Helper function to execute query
async function query(sql, params = []) {
  const [rows] = await db.query(sql, params)
  return rows
}

// =====================================================================
// 1. CLIENT MASTER APIS
// =====================================================================
router.get('/clients', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM ClientMaster ORDER BY ID DESC')
    const clients = rows.map((r) => ({
      id: String(r.ID),
      name: r.ClientName || '',
      relation: r.So || '',
      address: r.Address || '',
      phone: r.PhoneNo || '',
      extraPhone: '',
      referenceName: r.RefName || '',
      referencePhone: r.RefPhNo || '',
      fees: Number(r.ConFees || 0),
      date: r.ClientDate || '',
      createdAt: r.created_at,
    }))
    res.json(clients)
  } catch (err) {
    console.error('Error fetching clients:', err)
    res.status(500).json({ error: 'Failed to fetch clients' })
  }
})

router.post('/clients', async (req, res) => {
  try {
    const { name, relation, address, phone, referenceName, referencePhone, fees, date } = req.body
    const result = await query(
      'INSERT INTO ClientMaster (ClientName, So, Address, PhoneNo, RefName, RefPhNo, ConFees, ClientDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name || '', relation || '', address || '', phone || '', referenceName || '', referencePhone || '', Number(fees || 0), date || '']
    )
    const newClient = {
      id: String(result.insertId),
      name: name || '',
      relation: relation || '',
      address: address || '',
      phone: phone || '',
      referenceName: referenceName || '',
      referencePhone: referencePhone || '',
      fees: Number(fees || 0),
      date: date || '',
    }
    res.status(201).json(newClient)
  } catch (err) {
    console.error('Error creating client:', err)
    res.status(500).json({ error: 'Failed to create client' })
  }
})

router.put('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, relation, address, phone, referenceName, referencePhone, fees, date } = req.body
    await query(
      'UPDATE ClientMaster SET ClientName = ?, So = ?, Address = ?, PhoneNo = ?, RefName = ?, RefPhNo = ?, ConFees = ?, ClientDate = ? WHERE ID = ?',
      [name || '', relation || '', address || '', phone || '', referenceName || '', referencePhone || '', Number(fees || 0), date || '', id]
    )
    res.json({ id, name, relation, address, phone, referenceName, referencePhone, fees: Number(fees || 0), date })
  } catch (err) {
    console.error('Error updating client:', err)
    res.status(500).json({ error: 'Failed to update client' })
  }
})

router.delete('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM ClientMaster WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting client:', err)
    res.status(500).json({ error: 'Failed to delete client' })
  }
})

// =====================================================================
// 2. CASE MASTER APIS
// =====================================================================
router.get('/cases', async (req, res) => {
  try {
    const sql = `
      SELECT c.*, cl.ClientName, cl.PhoneNo as ClientPhone,
        (SELECT NextDate FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextDate,
        (SELECT cn.For FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextFor,
        (SELECT cn.CourtName FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextCourt
      FROM CaseMaster c
      LEFT JOIN ClientMaster cl ON c.ClientId = cl.ID
      ORDER BY c.ID DESC
    `
    const rows = await query(sql)
    const cases = rows.map((r) => ({
      id: String(r.ID),
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      phone: r.ClientPhone || '',
      caseNo: r.CaseNo || '',
      psCaseNo: r.PsCaseNo || '',
      courtName: r.CourtName || '',
      startDate: r.StartDate || '',
      ppName: r.PPName || '',
      psCaseDate: r.PsCaseDate || '',
      rackNo: r.RackNo || '',
      roomNo: r.RoomNo || '',
      underSection: r.Us || '',
      caseFor: r.For || '',
      lcName: r.LcName || '',
      versusName: r.VersusName || '',
      adAdvName: r.AdAdvName || '',
      caseDetails: r.CaseDetails || '',
      nextDate: r.NextDate || '',
      nextFor: r.NextFor || '',
      nextCourt: r.NextCourt || '',
    }))
    res.json(cases)
  } catch (err) {
    console.error('Error fetching cases:', err)
    res.status(500).json({ error: 'Failed to fetch cases' })
  }
})

router.post('/cases/bulk', async (req, res) => {
  try {
    const cases = req.body
    if (!Array.isArray(cases) || cases.length === 0) {
      return res.status(400).json({ error: 'Expected non-empty array of cases' })
    }

    let insertedCount = 0
    for (const c of cases) {
      const parsedClientId = c.clientId ? parseInt(String(c.clientId).replace(/\D/g, ''), 10) || null : null
      const result = await query(
        `INSERT INTO CaseMaster 
        (ClientId, CaseNo, PsCaseNo, CourtName, StartDate, PPName, PsCaseDate, RackNo, RoomNo, Us, \`For\`, LcName, VersusName, AdAdvName, CaseDetails) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsedClientId, c.caseNo || '', c.psCaseNo || '', c.courtName || '', c.startDate || '',
          c.ppName || '', c.psCaseDate || '', c.rackNo || '', c.roomNo || '', c.underSection || c.us || '',
          c.caseFor || c.for || c.purpose || '', c.lcName || c.lc || '', c.versusName || c.vsName || '', c.adAdvName || '', c.caseDetails || c.notes || ''
        ]
      )
      const caseId = result.insertId
      if (c.nextDate) {
        await query(
          `INSERT INTO CaseNext (CaseId, NextDate, \`For\`, CourtName, PPName) VALUES (?, ?, ?, ?, ?)`,
          [caseId, c.nextDate, c.nextFor || c.caseFor || c.purpose || '', c.courtName || '', c.ppName || '']
        )
      }
      insertedCount++
    }

    res.status(201).json({ success: true, count: insertedCount })
  } catch (err) {
    console.error('Bulk case import error:', err)
    res.status(500).json({ error: 'Failed to bulk import cases' })
  }
})

router.post('/cases', async (req, res) => {
  try {
    const {
      clientId, caseNo, psCaseNo, courtName, startDate, ppName, psCaseDate,
      rackNo, roomNo, underSection, caseFor, lcName, versusName, adAdvName,
      caseDetails, nextDate, nextFor
    } = req.body

    const parsedClientId = clientId ? parseInt(String(clientId).replace(/\D/g, ''), 10) || null : null

    const result = await query(
      `INSERT INTO CaseMaster 
      (ClientId, CaseNo, PsCaseNo, CourtName, StartDate, PPName, PsCaseDate, RackNo, RoomNo, Us, \`For\`, LcName, VersusName, AdAdvName, CaseDetails) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsedClientId, caseNo || '', psCaseNo || '', courtName || '', startDate || '',
        ppName || '', psCaseDate || '', rackNo || '', roomNo || '', underSection || '',
        caseFor || '', lcName || '', versusName || '', adAdvName || '', caseDetails || ''
      ]
    )

    const caseId = result.insertId

    // Insert initial next date in CaseNext if provided
    if (nextDate) {
      await query(
        `INSERT INTO CaseNext (CaseId, NextDate, \`For\`, CourtName, PPName) VALUES (?, ?, ?, ?, ?)`,
        [caseId, nextDate, nextFor || caseFor || '', courtName || '', ppName || '']
      )
    }

    res.status(201).json({
      id: String(caseId),
      clientId: parsedClientId ? String(parsedClientId) : '',
      caseNo,
      psCaseNo,
      courtName,
      startDate,
      ppName,
      psCaseDate,
      rackNo,
      roomNo,
      underSection,
      caseFor,
      lcName,
      versusName,
      adAdvName,
      caseDetails,
      nextDate: nextDate || '',
      nextFor: nextFor || '',
    })
  } catch (err) {
    console.error('Error creating case:', err)
    res.status(500).json({ error: 'Failed to create case' })
  }
})

router.put('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      clientId, caseNo, psCaseNo, courtName, startDate, ppName, psCaseDate,
      rackNo, roomNo, underSection, caseFor, lcName, versusName, adAdvName,
      caseDetails, nextDate, nextFor
    } = req.body

    const parsedClientId = clientId ? parseInt(String(clientId).replace(/\D/g, ''), 10) || null : null

    await query(
      `UPDATE CaseMaster SET 
      ClientId = ?, CaseNo = ?, PsCaseNo = ?, CourtName = ?, StartDate = ?, PPName = ?, 
      PsCaseDate = ?, RackNo = ?, RoomNo = ?, Us = ?, \`For\` = ?, LcName = ?, 
      VersusName = ?, AdAdvName = ?, CaseDetails = ?
      WHERE ID = ?`,
      [
        parsedClientId, caseNo || '', psCaseNo || '', courtName || '', startDate || '',
        ppName || '', psCaseDate || '', rackNo || '', roomNo || '', underSection || '',
        caseFor || '', lcName || '', versusName || '', adAdvName || '', caseDetails || '',
        id
      ]
    )

    if (nextDate) {
      await query(
        `INSERT INTO CaseNext (CaseId, NextDate, \`For\`, CourtName, PPName) VALUES (?, ?, ?, ?, ?)`,
        [id, nextDate, nextFor || caseFor || '', courtName || '', ppName || '']
      )
    }

    res.json({
      id,
      clientId: parsedClientId ? String(parsedClientId) : '',
      caseNo,
      psCaseNo,
      courtName,
      startDate,
      ppName,
      psCaseDate,
      rackNo,
      roomNo,
      underSection,
      caseFor,
      lcName,
      versusName,
      adAdvName,
      caseDetails,
      nextDate: nextDate || '',
      nextFor: nextFor || '',
    })
  } catch (err) {
    console.error('Error updating case:', err)
    res.status(500).json({ error: 'Failed to update case' })
  }
})

router.delete('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM CaseNext WHERE CaseId = ?', [id])
    await query('DELETE FROM CaseMaster WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting case:', err)
    res.status(500).json({ error: 'Failed to delete case' })
  }
})

// =====================================================================
// 3. CASE NEXT / REMINDERS APIS
// =====================================================================
router.get('/reminders', async (req, res) => {
  try {
    const sql = `
      SELECT cn.*, c.CaseNo, c.VersusName, cl.ClientName, cl.PhoneNo
      FROM CaseNext cn
      LEFT JOIN CaseMaster c ON cn.CaseId = c.ID
      LEFT JOIN ClientMaster cl ON c.ClientId = cl.ID
      ORDER BY cn.NextDate ASC
    `
    const rows = await query(sql)
    const reminders = rows.map((r) => ({
      id: String(r.ID),
      caseId: r.CaseId ? String(r.CaseId) : '',
      caseNo: r.CaseNo || '',
      clientName: r.ClientName || '',
      phone: r.PhoneNo || '',
      nextDate: r.NextDate || '',
      hearingDate: r.NextDate || '',
      for: r.For || '',
      stage: r.For || '',
      courtName: r.CourtName || '',
      ppName: r.PPName || '',
      otherAc: r.OtherAc || '',
      notes: r.OtherAc || '',
      status: 'Active',
    }))
    res.json(reminders)
  } catch (err) {
    console.error('Error fetching reminders:', err)
    res.status(500).json({ error: 'Failed to fetch reminders' })
  }
})

router.post('/reminders', async (req, res) => {
  try {
    const { caseId, nextDate, hearingDate, stage, courtName, ppName, otherAc, notes } = req.body
    const dateVal = nextDate || hearingDate || ''
    const stageVal = req.body.for || stage || ''
    const notesVal = otherAc || notes || ''
    const parsedCaseId = caseId ? parseInt(String(caseId).replace(/\D/g, ''), 10) || null : null

    const result = await query(
      `INSERT INTO CaseNext (CaseId, NextDate, \`For\`, CourtName, PPName, OtherAc) VALUES (?, ?, ?, ?, ?, ?)`,
      [parsedCaseId, dateVal, stageVal, courtName || '', ppName || '', notesVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      caseId: parsedCaseId ? String(parsedCaseId) : '',
      nextDate: dateVal,
      hearingDate: dateVal,
      for: stageVal,
      stage: stageVal,
      courtName: courtName || '',
      ppName: ppName || '',
      otherAc: notesVal,
      notes: notesVal,
    })
  } catch (err) {
    console.error('Error saving reminder:', err)
    res.status(500).json({ error: 'Failed to save reminder' })
  }
})

router.delete('/reminders/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM CaseNext WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting reminder:', err)
    res.status(500).json({ error: 'Failed to delete reminder' })
  }
})

// =====================================================================
// 4. BILLING APIS
// =====================================================================
router.get('/bills', async (req, res) => {
  try {
    const sql = `
      SELECT b.*, cl.ClientName
      FROM Billing b
      LEFT JOIN ClientMaster cl ON b.ClientId = cl.ID
      ORDER BY b.ID DESC
    `
    const rows = await query(sql)
    const bills = rows.map((r) => ({
      id: String(r.ID),
      billNumber: `BILL-${r.ID}`,
      billNo: String(r.ID),
      billDate: r.BillingDate ? String(r.BillingDate).split(' ')[0] : '',
      date: r.BillingDate || '',
      billingDate: r.BillingDate || '',
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      amount: Number(r.Amount || 0),
      totalAmount: Number(r.Amount || 0),
      totalBillAmount: Number(r.Amount || 0),
      contractAmount: Number(r.Amount || 0),
      particulars: r.Details || '',
      details: r.Details || '',
      description: r.Details || '',
    }))
    res.json(bills)
  } catch (err) {
    console.error('Error fetching bills:', err)
    res.status(500).json({ error: 'Failed to fetch bills' })
  }
})

router.post('/bills', async (req, res) => {
  try {
    const { clientId, date, billingDate, amount, totalAmount, particulars, details } = req.body
    const parsedClientId = clientId ? parseInt(String(clientId).replace(/\D/g, ''), 10) || null : null
    const dateVal = billingDate || date || new Date().toISOString().split('T')[0]
    const amountVal = Number(amount || totalAmount || 0)
    const detailsVal = particulars || details || ''

    const result = await query(
      'INSERT INTO Billing (ClientId, BillingDate, Amount, Details) VALUES (?, ?, ?, ?)',
      [parsedClientId, dateVal, amountVal, detailsVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      clientId: parsedClientId ? String(parsedClientId) : '',
      date: dateVal,
      billingDate: dateVal,
      amount: amountVal,
      totalAmount: amountVal,
      particulars: detailsVal,
      details: detailsVal,
    })
  } catch (err) {
    console.error('Error saving bill:', err)
    res.status(500).json({ error: 'Failed to save bill' })
  }
})

router.delete('/bills/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM Billing WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting bill:', err)
    res.status(500).json({ error: 'Failed to delete bill' })
  }
})

// =====================================================================
// 5. PAYMENT APIS
// =====================================================================
router.get('/payments', async (req, res) => {
  try {
    const sql = `
      SELECT p.*, cl.ClientName
      FROM Payment p
      LEFT JOIN ClientMaster cl ON p.ClientId = cl.ID
      ORDER BY p.ID DESC
    `
    const rows = await query(sql)
    const payments = rows.map((r) => ({
      id: String(r.ID),
      receiptNo: `REC-${r.ID}`,
      receiptNumber: `REC-${r.ID}`,
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      date: r.PaymentDate ? String(r.PaymentDate).split(' ')[0] : '',
      paymentDate: r.PaymentDate ? String(r.PaymentDate).split(' ')[0] : '',
      amount: Number(r.Amount || 0),
      paidAmount: Number(r.Amount || 0),
      remarks: r.Details || '',
      details: r.Details || '',
      paymentMode: r.Details || 'Cash',
    }))
    res.json(payments)
  } catch (err) {
    console.error('Error fetching payments:', err)
    res.status(500).json({ error: 'Failed to fetch payments' })
  }
})

router.post('/payments', async (req, res) => {
  try {
    const { clientId, date, paymentDate, amount, paidAmount, remarks, details } = req.body
    const parsedClientId = clientId ? parseInt(String(clientId).replace(/\D/g, ''), 10) || null : null
    const dateVal = paymentDate || date || new Date().toISOString().split('T')[0]
    const amountVal = Number(amount || paidAmount || 0)
    const detailsVal = remarks || details || ''

    const result = await query(
      'INSERT INTO Payment (ClientId, PaymentDate, Amount, Details) VALUES (?, ?, ?, ?)',
      [parsedClientId, dateVal, amountVal, detailsVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      clientId: parsedClientId ? String(parsedClientId) : '',
      date: dateVal,
      paymentDate: dateVal,
      amount: amountVal,
      paidAmount: amountVal,
      remarks: detailsVal,
      details: detailsVal,
    })
  } catch (err) {
    console.error('Error saving payment:', err)
    res.status(500).json({ error: 'Failed to save payment' })
  }
})

router.delete('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM Payment WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting payment:', err)
    res.status(500).json({ error: 'Failed to delete payment' })
  }
})

// =====================================================================
// 6. EXPENSE & EXPENSE HEAD APIS
// =====================================================================
router.get('/expense-heads', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM ExpenseHeadMaster ORDER BY ExpenseHead ASC')
    const heads = rows.map((r) => ({
      id: String(r.ID),
      name: r.ExpenseHead || '',
      expenseHead: r.ExpenseHead || '',
    }))
    res.json(heads)
  } catch (err) {
    console.error('Error fetching expense heads:', err)
    res.status(500).json({ error: 'Failed to fetch expense heads' })
  }
})

router.post('/expense-heads', async (req, res) => {
  try {
    const { name, expenseHead } = req.body
    const headName = (name || expenseHead || '').trim()
    if (!headName) {
      return res.status(400).json({ error: 'Expense head name is required' })
    }
    const result = await query('INSERT INTO ExpenseHeadMaster (ExpenseHead) VALUES (?)', [headName])
    res.status(201).json({
      id: String(result.insertId),
      name: headName,
      expenseHead: headName,
    })
  } catch (err) {
    console.error('Error saving expense head:', err)
    res.status(500).json({ error: 'Failed to save expense head' })
  }
})

router.get('/expenses', async (req, res) => {
  try {
    const sql = `
      SELECT e.*, ehm.ExpenseHead as HeadName
      FROM Expense e
      LEFT JOIN ExpenseHeadMaster ehm ON e.ExpenseId = ehm.ID
      ORDER BY e.ID DESC
    `
    const rows = await query(sql)
    const expenses = rows.map((r) => ({
      id: String(r.ID),
      headId: r.ExpenseId ? String(r.ExpenseId) : '',
      expenseId: r.ExpenseId ? String(r.ExpenseId) : '',
      headName: r.HeadName || '',
      paidTo: r.PaidTo || '',
      date: r.ExpenseDate || '',
      expenseDate: r.ExpenseDate || '',
      amount: Number(r.Amount || 0),
      remarks: r.Details || '',
      details: r.Details || '',
    }))
    res.json(expenses)
  } catch (err) {
    console.error('Error fetching expenses:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

router.post('/expenses', async (req, res) => {
  try {
    const { headId, expenseId, paidTo, date, expenseDate, amount, remarks, details } = req.body
    const parsedHeadId = (headId || expenseId) ? parseInt(String(headId || expenseId).replace(/\D/g, ''), 10) || null : null
    const dateVal = expenseDate || date || new Date().toISOString().split('T')[0]
    const amountVal = Number(amount || 0)
    const detailsVal = remarks || details || ''

    const result = await query(
      'INSERT INTO Expense (ExpenseId, PaidTo, ExpenseDate, Amount, Details) VALUES (?, ?, ?, ?, ?)',
      [parsedHeadId, paidTo || '', dateVal, amountVal, detailsVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      headId: parsedHeadId ? String(parsedHeadId) : '',
      paidTo: paidTo || '',
      date: dateVal,
      amount: amountVal,
      remarks: detailsVal,
    })
  } catch (err) {
    console.error('Error saving expense:', err)
    res.status(500).json({ error: 'Failed to save expense' })
  }
})

router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM Expense WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting expense:', err)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// =====================================================================
// 7. WAITING LIST & CONSULTATION QUEUE APIS (Chamber & TV Display)
// =====================================================================
router.get('/waiting-list', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM WaitingList ORDER BY ID ASC')
    const list = rows.map((r) => ({
      id: String(r.ID),
      name: r.Name || '',
      clientName: r.Name || '',
      status: r.Status === 1 ? 'In Consultation' : r.Status === 2 ? 'Completed' : 'Waiting',
      statusCode: r.Status,
      address: r.Address || '',
      phoneNo: r.PhoneNo || '',
      mobile: r.PhoneNo || '',
      timeSlot: r.TimeSlot || '',
      consultancyType: r.ConsultancyType || 'Conference',
      date: r.QueueDate || '',
      queueDate: r.QueueDate || '',
      createdAt: r.created_at,
    }))
    res.json(list)
  } catch (err) {
    console.error('Error fetching waiting list:', err)
    res.status(500).json({ error: 'Failed to fetch waiting list' })
  }
})

router.post('/waiting-list', async (req, res) => {
  try {
    const { name, clientName, status, address, phoneNo, mobile, timeSlot, consultancyType, date, queueDate } = req.body
    const nameVal = (name || clientName || '').trim()
    const phoneVal = phoneNo || mobile || ''
    const dateVal = queueDate || date || new Date().toISOString().split('T')[0]
    const typeVal = consultancyType || 'Conference'
    const statusVal = status === 'In Consultation' ? 1 : status === 'Completed' ? 2 : 0

    const result = await query(
      'INSERT INTO WaitingList (Name, Status, Address, PhoneNo, TimeSlot, ConsultancyType, QueueDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nameVal, statusVal, address || '', phoneVal, timeSlot || '', typeVal, dateVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      name: nameVal,
      clientName: nameVal,
      status: statusVal === 1 ? 'In Consultation' : statusVal === 2 ? 'Completed' : 'Waiting',
      statusCode: statusVal,
      address: address || '',
      phoneNo: phoneVal,
      mobile: phoneVal,
      timeSlot: timeSlot || '',
      consultancyType: typeVal,
      date: dateVal,
      queueDate: dateVal,
    })
  } catch (err) {
    console.error('Error creating waiting list entry:', err)
    res.status(500).json({ error: 'Failed to create waiting list entry' })
  }
})

router.put('/waiting-list/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, consultancyType, timeSlot } = req.body
    let statusVal = 0
    if (typeof status === 'number') {
      statusVal = status
    } else if (status === 'In Consultation') {
      statusVal = 1
    } else if (status === 'Completed') {
      statusVal = 2
    }

    if (consultancyType) {
      await query('UPDATE WaitingList SET Status = ?, ConsultancyType = ? WHERE ID = ?', [statusVal, consultancyType, id])
    } else {
      await query('UPDATE WaitingList SET Status = ? WHERE ID = ?', [statusVal, id])
    }

    res.json({ id, status, statusVal })
  } catch (err) {
    console.error('Error updating waiting list entry:', err)
    res.status(500).json({ error: 'Failed to update waiting list entry' })
  }
})

router.delete('/waiting-list/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM WaitingList WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting waiting list entry:', err)
    res.status(500).json({ error: 'Failed to delete waiting list entry' })
  }
})

// =====================================================================
// 8. ANNOUNCEMENTS APIS (Digital Signage / TV Display Feature)
// =====================================================================
router.get('/announcements', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM Announcements WHERE IsActive = 1 ORDER BY Priority DESC, ID DESC')
    const announcements = rows.map((r) => ({
      id: String(r.ID),
      headline: r.Headline || '',
      text: r.Message || '',
      message: r.Message || '',
      tag: r.Category || 'Chamber Advisory',
      category: r.Category || 'Chamber Advisory',
      priority: r.Priority || 'Normal',
      date: r.NoticeDate || 'Today',
      noticeDate: r.NoticeDate || 'Today',
      isActive: Boolean(r.IsActive),
    }))
    res.json(announcements)
  } catch (err) {
    console.error('Error fetching announcements:', err)
    res.status(500).json({ error: 'Failed to fetch announcements' })
  }
})

router.post('/announcements', async (req, res) => {
  try {
    const { headline, text, message, tag, category, priority, date, noticeDate } = req.body
    const headVal = (headline || '').trim()
    const msgVal = (text || message || '').trim()
    const catVal = tag || category || 'Chamber Advisory'
    const prioVal = priority || 'Normal'
    const dateVal = noticeDate || date || new Date().toISOString().split('T')[0]

    const result = await query(
      'INSERT INTO Announcements (Headline, Message, Category, Priority, NoticeDate, IsActive) VALUES (?, ?, ?, ?, ?, 1)',
      [headVal, msgVal, catVal, prioVal, dateVal]
    )

    res.status(201).json({
      id: String(result.insertId),
      headline: headVal,
      text: msgVal,
      message: msgVal,
      tag: catVal,
      category: catVal,
      priority: prioVal,
      date: dateVal,
      noticeDate: dateVal,
      isActive: true,
    })
  } catch (err) {
    console.error('Error saving announcement:', err)
    res.status(500).json({ error: 'Failed to save announcement' })
  }
})

router.delete('/announcements/:id', async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM Announcements WHERE ID = ?', [id])
    res.json({ success: true, id })
  } catch (err) {
    console.error('Error deleting announcement:', err)
    res.status(500).json({ error: 'Failed to delete announcement' })
  }
})

// =====================================================================
// 9. COMPLETE SYSTEM DATA SYNC API
// Returns full database snapshot in a single fast call for UI initialization
// =====================================================================
router.get('/sync', async (req, res) => {
  try {
    const [clientsRaw, casesRaw, remindersRaw, billsRaw, paymentsRaw, headsRaw, expensesRaw, waitingRaw, announcementsRaw] = await Promise.all([
      query('SELECT * FROM ClientMaster ORDER BY ID DESC'),
      query(`
        SELECT c.*, cl.ClientName, cl.PhoneNo as ClientPhone,
          (SELECT NextDate FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextDate,
          (SELECT cn.For FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextFor,
          (SELECT cn.CourtName FROM CaseNext cn WHERE cn.CaseId = c.ID ORDER BY cn.ID DESC LIMIT 1) as NextCourt
        FROM CaseMaster c
        LEFT JOIN ClientMaster cl ON c.ClientId = cl.ID
        ORDER BY c.ID DESC
      `),
      query(`
        SELECT cn.*, c.CaseNo, c.VersusName, cl.ClientName, cl.PhoneNo
        FROM CaseNext cn
        LEFT JOIN CaseMaster c ON cn.CaseId = c.ID
        LEFT JOIN ClientMaster cl ON c.ClientId = cl.ID
        ORDER BY cn.ID DESC
        LIMIT 300
      `),
      query('SELECT b.*, cl.ClientName FROM Billing b LEFT JOIN ClientMaster cl ON b.ClientId = cl.ID ORDER BY b.ID DESC LIMIT 300'),
      query('SELECT p.*, cl.ClientName FROM Payment p LEFT JOIN ClientMaster cl ON p.ClientId = cl.ID ORDER BY p.ID DESC LIMIT 300'),
      query('SELECT * FROM ExpenseHeadMaster ORDER BY ExpenseHead ASC'),
      query(`
        SELECT e.*, ehm.ExpenseHead as HeadName
        FROM Expense e
        LEFT JOIN ExpenseHeadMaster ehm ON e.ExpenseId = ehm.ID
        ORDER BY e.ID DESC
        LIMIT 300
      `),
      query('SELECT * FROM WaitingList ORDER BY ID ASC'),
      query('SELECT * FROM Announcements WHERE IsActive = 1 ORDER BY Priority DESC, ID DESC')
    ])

    const clients = clientsRaw.map((r) => ({
      id: String(r.ID),
      name: r.ClientName || '',
      relation: r.So || '',
      address: r.Address || '',
      phone: r.PhoneNo || '',
      extraPhone: '',
      referenceName: r.RefName || '',
      referencePhone: r.RefPhNo || '',
      fees: Number(r.ConFees || 0),
      date: r.ClientDate || '',
      createdAt: r.created_at,
    }))

    const cases = casesRaw.map((r) => ({
      id: String(r.ID),
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      phone: r.ClientPhone || '',
      caseNo: r.CaseNo || '',
      psCaseNo: r.PsCaseNo || '',
      courtName: r.CourtName || '',
      startDate: r.StartDate || '',
      ppName: r.PPName || '',
      psCaseDate: r.PsCaseDate || '',
      rackNo: r.RackNo || '',
      roomNo: r.RoomNo || '',
      underSection: r.Us || '',
      caseFor: r.For || '',
      lcName: r.LcName || '',
      versusName: r.VersusName || '',
      adAdvName: r.AdAdvName || '',
      caseDetails: r.CaseDetails || '',
      nextDate: r.NextDate || '',
      nextFor: r.NextFor || '',
      nextCourt: r.NextCourt || '',
    }))

    const reminders = remindersRaw.map((r) => ({
      id: String(r.ID),
      caseId: r.CaseId ? String(r.CaseId) : '',
      caseNo: r.CaseNo || '',
      clientName: r.ClientName || '',
      phone: r.PhoneNo || '',
      nextDate: r.NextDate || '',
      hearingDate: r.NextDate || '',
      for: r.For || '',
      stage: r.For || '',
      courtName: r.CourtName || '',
      ppName: r.PPName || '',
      otherAc: r.OtherAc || '',
      notes: r.OtherAc || '',
      status: 'Active',
    }))

    const bills = billsRaw.map((r) => ({
      id: String(r.ID),
      billNumber: `BILL-${r.ID}`,
      billNo: String(r.ID),
      billDate: r.BillingDate ? String(r.BillingDate).split(' ')[0] : '',
      date: r.BillingDate || '',
      billingDate: r.BillingDate || '',
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      amount: Number(r.Amount || 0),
      totalAmount: Number(r.Amount || 0),
      totalBillAmount: Number(r.Amount || 0),
      contractAmount: Number(r.Amount || 0),
      particulars: r.Details || '',
      details: r.Details || '',
      description: r.Details || '',
    }))

    const payments = paymentsRaw.map((r) => ({
      id: String(r.ID),
      receiptNo: `REC-${r.ID}`,
      receiptNumber: `REC-${r.ID}`,
      clientId: r.ClientId ? String(r.ClientId) : '',
      clientName: r.ClientName || '',
      date: r.PaymentDate ? String(r.PaymentDate).split(' ')[0] : '',
      paymentDate: r.PaymentDate ? String(r.PaymentDate).split(' ')[0] : '',
      amount: Number(r.Amount || 0),
      paidAmount: Number(r.Amount || 0),
      remarks: r.Details || '',
      details: r.Details || '',
      paymentMode: r.Details || 'Cash',
    }))

    const expenseHeads = headsRaw.map((r) => ({
      id: String(r.ID),
      name: r.ExpenseHead || '',
      expenseHead: r.ExpenseHead || '',
    }))

    const expenses = expensesRaw.map((r) => ({
      id: String(r.ID),
      headId: r.ExpenseId ? String(r.ExpenseId) : '',
      expenseId: r.ExpenseId ? String(r.ExpenseId) : '',
      headName: r.HeadName || '',
      paidTo: r.PaidTo || '',
      date: r.ExpenseDate || '',
      expenseDate: r.ExpenseDate || '',
      amount: Number(r.Amount || 0),
      remarks: r.Details || '',
      details: r.Details || '',
    }))

    const waitingList = waitingRaw.map((r) => ({
      id: String(r.ID),
      name: r.Name || '',
      clientName: r.Name || '',
      status: r.Status === 1 ? 'In Consultation' : r.Status === 2 ? 'Completed' : 'Waiting',
      statusCode: r.Status,
      address: r.Address || '',
      phoneNo: r.PhoneNo || '',
      mobile: r.PhoneNo || '',
      timeSlot: r.TimeSlot || '',
      consultancyType: r.ConsultancyType || 'Conference',
      date: r.QueueDate || '',
      queueDate: r.QueueDate || '',
    }))

    const announcements = announcementsRaw.map((r) => ({
      id: String(r.ID),
      headline: r.Headline || '',
      text: r.Message || '',
      message: r.Message || '',
      tag: r.Category || 'Chamber Advisory',
      category: r.Category || 'Chamber Advisory',
      priority: r.Priority || 'Normal',
      date: r.NoticeDate || 'Today',
      noticeDate: r.NoticeDate || 'Today',
      isActive: Boolean(r.IsActive),
    }))

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        clients: clients.length,
        cases: cases.length,
        reminders: reminders.length,
        bills: bills.length,
        payments: payments.length,
        expenseHeads: expenseHeads.length,
        expenses: expenses.length,
        waitingList: waitingList.length,
        announcements: announcements.length,
      },
      data: {
        clients,
        cases,
        reminders,
        bills,
        payments,
        expenseHeads,
        expenses,
        waitingList,
        announcements,
      }
    })
  } catch (err) {
    console.error('Sync Error:', err)
    res.status(500).json({ error: 'Failed to synchronize system data' })
  }
})

// =====================================================================
// 10. REAL-TIME PRACTICE OVERVIEW METRICS API
// Instant SQL aggregation directly from MySQL legalcase_db
// =====================================================================
router.get('/overview', async (req, res) => {
  try {
    const [clientRow] = await query('SELECT COUNT(*) as count, COALESCE(SUM(ConFees), 0) as totalConFees FROM ClientMaster')
    const [caseRow] = await query('SELECT COUNT(*) as count FROM CaseMaster')
    const [billingRow] = await query('SELECT COALESCE(SUM(Amount), 0) as totalBilling FROM Billing')
    const [paymentRow] = await query('SELECT COALESCE(SUM(Amount), 0) as totalPayment FROM Payment')
    const [expenseRow] = await query('SELECT COALESCE(SUM(Amount), 0) as totalExpense FROM Expense')

    res.json({
      success: true,
      data: {
        totalClients: Number(clientRow?.count || 0),
        totalCases: Number(caseRow?.count || 0),
        totalBilling: Number(billingRow?.totalBilling || 0),
        totalPayment: Number(paymentRow?.totalPayment || 0),
        totalExpense: Number(expenseRow?.totalExpense || 0),
        totalConsultancy: Number(clientRow?.totalConFees || 0),
      }
    })
  } catch (err) {
    console.error('Overview Error:', err)
    res.status(500).json({ error: 'Failed to fetch practice overview metrics' })
  }
})

module.exports = router
