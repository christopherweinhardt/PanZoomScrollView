import { Platform, StyleSheet, Text, View } from 'react-native';

const SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

const VERSES = [
  {
    n: '1',
    lines: [
      'Amazing grace! how sweet the sound,',
      'That saved a wretch like me!',
      'I once was lost, but now am found,',
      'Was blind, but now I see.',
    ],
  },
  {
    n: '2',
    lines: [
      "'Twas grace that taught my heart to fear,",
      'And grace my fears relieved;',
      'How precious did that grace appear',
      'The hour I first believed!',
    ],
  },
  {
    n: '3',
    lines: [
      'Through many dangers, toils, and snares',
      'I have already come;',
      "'Tis grace hath brought me safe thus far,",
      'And grace will lead me home.',
    ],
  },
  {
    n: '4',
    lines: [
      "When we've been there ten thousand years,",
      'Bright shining as the sun,',
      "We've no less days to sing God's praise",
      "Than when we'd first begun.",
    ],
  },
] as const;

const NOTE_TOPS = [22, 22, 6, 2, 10, 6, 18, 22, 30, 34, 26, 22, 14, 18];

export function HymnPage() {
  return (
    <View style={styles.page}>
      <View style={styles.sheet}>
        <View style={styles.mast}>
          <Text style={styles.hymnNo}>HYMN 143</Text>
          <Text style={styles.meter}>C.M.</Text>
        </View>
        <Text style={styles.title}>Amazing Grace</Text>
        <Text style={styles.tune}>NEW BRITAIN · John Newton, 1779</Text>
        <Staff />
        <View style={styles.verses}>
          {VERSES.map((verse) => (
            <View key={verse.n} style={styles.verse}>
              <Text style={styles.verseNo}>{verse.n}</Text>
              <View style={styles.verseBody}>
                {verse.lines.map((line) => (
                  <Text key={line} style={styles.line}>
                    {line}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>Public domain · 1 Chronicles 17:16–17</Text>
      </View>
    </View>
  );
}

function Staff() {
  return (
    <View style={styles.staff}>
      <Text style={styles.clef}>𝄞</Text>
      <View style={styles.staffLines}>
        {[0, 1, 2, 3, 4].map((line) => (
          <View key={line} style={styles.staffLine} />
        ))}
        {NOTE_TOPS.map((top, index) => (
          <View
            key={index}
            style={[
              styles.note,
              {
                top,
                left: `${4 + (index / (NOTE_TOPS.length - 1)) * 90}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4efe4',
    userSelect: 'none',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
  },
  mast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8d1d1d',
    paddingBottom: 6,
  },
  hymnNo: {
    fontFamily: SERIF,
    color: '#8d1d1d',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  meter: {
    fontFamily: SERIF,
    color: '#5c5346',
    fontSize: 12,
  },
  title: {
    fontFamily: SERIF,
    color: '#1c140c',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  tune: {
    fontFamily: SERIF,
    color: '#6b6256',
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 2,
    marginBottom: 8,
  },
  staff: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clef: {
    fontSize: 42,
    lineHeight: 48,
    color: '#1c140c',
    width: 36,
    marginRight: 4,
  },
  staffLines: {
    flex: 1,
    height: 44,
    justifyContent: 'space-between',
    position: 'relative',
  },
  staffLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1c140c',
  },
  note: {
    position: 'absolute',
    width: 9,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1c140c',
  },
  verses: {
    gap: 12,
    paddingTop: 4,
  },
  verse: {
    flexDirection: 'row',
    gap: 8,
  },
  verseNo: {
    fontFamily: SERIF,
    color: '#8d1d1d',
    fontSize: 12,
    fontWeight: '700',
    width: 14,
    lineHeight: 16,
  },
  verseBody: {
    flex: 1,
  },
  line: {
    fontFamily: SERIF,
    color: '#1c140c',
    fontSize: 13,
    lineHeight: 17,
  },
  footer: {
    fontFamily: SERIF,
    color: '#6b6256',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
});
