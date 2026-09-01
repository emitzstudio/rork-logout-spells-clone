#!/bin/sh
# Candidate photo fetch: Unsplash direct image URLs at 800px for contact-sheet review.
U="fm=jpg&q=70&w=800&fit=max"
curl -sL --parallel --parallel-max 8 \
  -o c01.jpg "https://images.unsplash.com/photo-1723871493526-79bfa8d9402e?$U" \
  -o c02.jpg "https://images.unsplash.com/photo-1720163700787-105247acee22?$U" \
  -o c03.jpg "https://images.unsplash.com/photo-1631378329038-eb69692df914?$U" \
  -o c04.jpg "https://images.unsplash.com/photo-1653545709990-a6a4c8a6c36c?$U" \
  -o c05.jpg "https://images.unsplash.com/photo-1718016048656-22e02d7b1055?$U" \
  -o c06.jpg "https://images.unsplash.com/photo-1626401314394-b90a430c4d0d?$U" \
  -o c07.jpg "https://images.unsplash.com/photo-1601821139990-9fc929db79ce?$U" \
  -o c08.jpg "https://images.unsplash.com/photo-1601821139314-66a4d14cfc00?$U" \
  -o c09.jpg "https://images.unsplash.com/photo-1612438214708-f428a707dd4e?$U" \
  -o c10.jpg "https://images.unsplash.com/photo-1729409141463-3dfbf786e756?$U" \
  -o c11.jpg "https://images.unsplash.com/photo-1730021618560-cdb6b81592c2?$U" \
  -o c12.jpg "https://images.unsplash.com/photo-1532023671337-ca3f6341e44e?$U" \
  -o c13.jpg "https://images.unsplash.com/photo-1652501836325-5610537fbb96?$U" \
  -o c14.jpg "https://images.unsplash.com/photo-1630906672765-387a90c3cc3c?$U" \
  -o c15.jpg "https://images.unsplash.com/photo-1724541384318-6df31efc7ed9?$U" \
  -o c16.jpg "https://images.unsplash.com/photo-1777239813236-2cd0de312a90?$U" \
  -o c17.jpg "https://images.unsplash.com/photo-1692368159780-fd0950fdfb1e?$U" \
  -o c18.jpg "https://images.unsplash.com/photo-1749560110171-fb60807205bc?$U" \
  -o c19.jpg "https://images.unsplash.com/photo-1735603509639-bbc85f456241?$U" \
  -o c20.jpg "https://images.unsplash.com/photo-1667330353574-2df2706f15a1?$U" \
  -o c21.jpg "https://images.unsplash.com/photo-1580548721385-892f405a3d2a?$U" \
  -o c22.jpg "https://images.unsplash.com/photo-1753925364019-0fa40a7eac5a?$U" \
  -o c23.jpg "https://images.unsplash.com/photo-1750166942048-9a51da2bcefd?$U" \
  -o c24.jpg "https://images.unsplash.com/photo-1723279893372-c4e430158b12?$U" \
  -o c25.jpg "https://images.unsplash.com/photo-1753186904516-37e0f5a4657e?$U" \
  -o c26.jpg "https://images.unsplash.com/photo-1758272960011-3586efc17bbf?$U" \
  -o c27.jpg "https://images.unsplash.com/photo-1574336310290-8f545d91cd5f?$U" \
  -o c28.jpg "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?$U"
ls -la c*.jpg | wc -l
