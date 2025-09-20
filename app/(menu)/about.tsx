import theme, { styles as appStyles } from '@/assets/theme/styles'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'phosphor-react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'

export default function AboutScreen() {
  const router = useRouter()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const INFO_URL = 'https://raw.githubusercontent.com/m0hamed-ux/tribblebook-info/main/appinfo.md'

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(INFO_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setMarkdown(text)
    } catch (e: any) {
      setError('تعذر تحميل معلومات التطبيق. تحقق من الاتصال وحاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const html = useMemo(() => {
    if (!markdown) return ''
    const mdJson = JSON.stringify(markdown)
    const bg = theme.colors.surface
    const text = theme.colors.text.primary
    const secondary = theme.colors.text.secondary
    const link = theme.colors.primary || '#3b82f6'
    return `<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root { color-scheme: light dark; }
          html, body { padding:0; margin:0; background:${bg}; }
          body { color:${text}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height:1.7; }
          .container { padding: 12px 14px 24px; }
          h1, h2, h3, h4, h5, h6 { color:${text}; margin: 1.2em 0 0.6em; }
          p { color:${secondary}; margin: 0.6em 0; }
          ul, ol { padding-inline-start: 1.2em; color:${secondary}; }
          li { margin: 0.3em 0; }
          a { color:${link}; text-decoration: none; }
          a:hover { text-decoration: underline; }
          code, pre { background: rgba(127,127,127,0.12); border-radius: 6px; padding: 0.2em 0.4em; }
          pre { padding: 10px; overflow-x: auto; }
          blockquote { border-right: 3px solid rgba(127,127,127,0.3); margin: 1em 0; padding: 0.2em 0.8em; color:${secondary}; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid rgba(127,127,127,0.25); padding: 6px 8px; }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      </head>
      <body>
        <div class="container" id="content"></div>
        <script>
          const md = ${mdJson};
          marked.setOptions({ mangle: false, headerIds: false, breaks: true });
          document.getElementById('content').innerHTML = marked.parse(md);
        </script>
      </body>
    </html>`
  }, [markdown])
  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>معلومات التطبيق</Text>
          <Text style={s.headerSubtitle}>تعرف أكثر عن تريبل بوك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>
      <View style={s.content}>
        {loading && (
          <View style={s.center}>
            <ActivityIndicator size="small" color={theme.colors.text.secondary} />
            <Text style={[s.headerSubtitle, { marginTop: 8 }]}>جارٍ تحميل معلومات التطبيق…</Text>
          </View>
        )}
        {!!error && !loading && (
          <View style={[s.center, s.card]}> 
            <Text style={[s.headerSubtitle, { marginBottom: 10 }]}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={load}>
              <Text style={s.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}
        {!!markdown && !loading && !error && (
          <View style={s.card}>
            <WebView
              originWhitelist={["*"]}
              javaScriptEnabled
              setSupportMultipleWindows={false}
              incognito
              source={{ html }}
              style={{ flex: 1, width: '100%' }}
            />
          </View>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: theme.colors.text.primary,
    fontFamily: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    fontFamily: 'regular',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff000000',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 0,
    flex: 1,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    backgroundColor: theme.colors.primary || '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontFamily: 'bold',
    fontSize: 12,
  },
})
