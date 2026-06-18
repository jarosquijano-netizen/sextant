import { Router } from 'express'
import multer from 'multer'
import { extractPdfText } from '../lib/pdf-parser.js'
import { extractDocxText } from '../lib/docx-parser.js'
import { callClaude } from '../lib/claude-client.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const mime = req.file.mimetype
  const originalName = req.file.originalname?.toLowerCase() || ''
  let text = ''

  try {
    if (mime === 'application/pdf' || originalName.endsWith('.pdf')) {
      text = await extractPdfText(req.file.buffer)
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      originalName.endsWith('.docx')
    ) {
      text = await extractDocxText(req.file.buffer)
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload a PDF or DOCX.' })
    }
  } catch (err) {
    return res.status(422).json({ error: `Failed to extract text: ${err.message}` })
  }

  if (!text.trim()) return res.status(422).json({ error: 'Could not extract text from the file.' })

  let profileDraft = null
  try {
    profileDraft = await callClaude({
      system: `You are a CV parser. Extract structured profile data from the provided CV text.
Return a JSON object matching this schema exactly (omit fields you cannot find, do not invent data):
{
  "personal": { "firstName": "", "lastName": "", "email": "", "phone": "", "location": "", "linkedinUrl": "" },
  "summary": "",
  "targetTitles": [],
  "experience": [{ "company": "", "title": "", "startDate": "", "endDate": "", "bullets": [] }],
  "education": [{ "degree": "", "school": "", "year": "" }],
  "skills": { "product": [], "domain": [], "leadership": [], "languages": [] }
}`,
      user: text.slice(0, 12000),
      jsonMode: true,
      maxTokens: 2048,
    })
  } catch (err) {
    // Return extracted text even if AI structuring fails
    return res.json({ extractedText: text, profileDraft: null, aiError: err.message })
  }

  res.json({ extractedText: text, profileDraft })
})

export default router
