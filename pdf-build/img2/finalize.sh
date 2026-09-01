#!/bin/sh
# Fetch chosen photos at high res and crop to Grimoire template aspect ratios.
# Full page (cover/closing): 1191x1684 (0.707). Day band: 1600x632 (2.53).
set -e
mkdir -p hi final
UB="fm=jpg&q=85&fit=max"

fetchhi() {
  [ -f "hi/$1.jpg" ] || curl -sL --fail -o "hi/$1.jpg" "https://images.unsplash.com/$2?$UB&w=$3"
}

fetchhi c01 photo-1723871493526-79bfa8d9402e 1400
fetchhi c02 photo-1720163700787-105247acee22 1600
fetchhi c03 photo-1631378329038-eb69692df914 1600
fetchhi c05 photo-1718016048656-22e02d7b1055 1600
fetchhi c07 photo-1601821139990-9fc929db79ce 1600
fetchhi c08 photo-1601821139314-66a4d14cfc00 1600
fetchhi c10 photo-1729409141463-3dfbf786e756 1600
fetchhi c11 photo-1730021618560-cdb6b81592c2 1600
fetchhi c12 photo-1532023671337-ca3f6341e44e 1400
fetchhi c13 photo-1652501836325-5610537fbb96 1600
fetchhi c14 photo-1630906672765-387a90c3cc3c 1600
fetchhi c15 photo-1724541384318-6df31efc7ed9 1400
fetchhi c16 photo-1777239813236-2cd0de312a90 1600
fetchhi c17 photo-1692368159780-fd0950fdfb1e 1600
fetchhi c18 photo-1749560110171-fb60807205bc 1600
fetchhi c20 photo-1667330353574-2df2706f15a1 1600
fetchhi c23 photo-1750166942048-9a51da2bcefd 1600
fetchhi c26 photo-1758272960011-3586efc17bbf 1600

# Full-page portrait crops: center-x crop to 0.707 ratio, or height crop with y bias.
page() { # src out xbias(0..1) ybias(0..1)
  ffmpeg -y -loglevel error -i "hi/$1.jpg" -vf "crop='min(iw,ih*0.7072)':'min(ih,iw/0.7072)':'(iw-ow)*$3':'(ih-oh)*$4',scale=1191:1684" "final/$2.jpg"
}
# Day band crops: full width, 0.395*iw tall window at y bias, scaled to 1600x632.
band() { # src out ybias(0..1)
  ffmpeg -y -loglevel error -i "hi/$1.jpg" -vf "crop=iw:'min(ih,iw*0.395)':0:'(ih-oh)*$3',scale=1600:632" "final/$2.jpg"
}

page c01 vof-cover   0.5 0.5
band c18 vof-d0      0.45
band c11 vof-d1      0.35
band c05 vof-d2      0.30
band c02 vof-d3      0.18
band c03 vof-d4      0.50
band c07 vof-d5      0.50
band c08 vof-d6      0.25
page c23 vof-night   0.5 0.5

page c12 jb-cover    0.5 0.5
page c15 jb-cover2   0.5 0.30
band c20 jb-d0       0.50
band c14 jb-d1       0.35
band c13 jb-d1b      0.50
band c17 jb-d2       0.50
band c16 jb-d34      0.40
page c26 jb-night    0.5 0.5

ls final | wc -l
