# coding: utf-8

"""
Copyright 2021 João T. Carvalho-Neto, Fernando A. Pedersen and Matheus N. S. Silva

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

"""
****************************************
Stellector Project Horus 3D parts.

FreeCAD Python scripting codes
****************************************
"""

 
import math
from FreeCAD import Base
from FreeCAD import Part



#********************************************************
# Auxiliary constants, functions and classes declarations
#******************************************************** 

V0 = Base.Vector(0.0, 0.0, 0.0)
VX = Base.Vector(1.0, 0.0, 0.0)
VY = Base.Vector(0.0, 1.0, 0.0)
VZ = Base.Vector(0.0, 0.0, 1.0)

def vecX(x):
	return Base.Vector(x, 0, 0)
def vecY(y):
	return Base.Vector(0, y, 0)
def vecZ(z):
	return Base.Vector(0, 0, z)

def lenX(part):
	return maxX(part).x - minX(part).x
def lenY(part):
	return maxY(part).y - minY(part).y
def lenZ(part):
	return maxZ(part).z - minZ(part).z
def centerX(part):
	return (maxX(part) + minX(part))/2.0
def centerY(part):
	return (maxY(part) + minY(part))/2.0
def centerZ(part):
	return (maxZ(part) + minZ(part))/2.0
def center(part):
	return Base.Vector(centerX(part).x, centerY(part).y, centerZ(part).z)

def maxX(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.x > m.x:
				m = p
	return m
def minX(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.x < m.x:
				m = p
	return m
def maxY(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.y > m.y:
				m = p
	return m
def minY(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.y < m.y:
				m = p
	return m
def maxZ(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.z > m.z:
				m = p
	return m
def minZ(part):
	m = part.Edges[0].Vertexes[0].Point
	for edge in part.Edges:
		for p in edge.discretize(200):
			if p.z < m.z:
				m = p
	return m

def mirrorX(part):
	M = Base.Matrix()
	M.A11 = -1.0
	return part.transformGeometry(M)
def mirrorY(part):
	M = Base.Matrix()
	M.A22 = -1.0
	return part.transformGeometry(M)
def mirrorZ(part):
	M = Base.Matrix()
	M.A33 = -1.0
	return part.transformGeometry(M)

def ArcAngle(rad, startang, finishang):
	midang = (startang+finishang)/2.0
	V1 = Base.Vector(rad*math.cos(startang*math.pi/180),rad*math.sin(startang*math.pi/180),0)
	V2 = Base.Vector(rad*math.cos(midang*math.pi/180),rad*math.sin(midang*math.pi/180),0)
	V3 = Base.Vector(rad*math.cos(finishang*math.pi/180),rad*math.sin(finishang*math.pi/180),0)
	return Part.Arc(V1, V2, V3)

def ArcGreatAngle(rad, startang, finishang):
	midang = 180+(startang+finishang)/2.0
	V1 = Base.Vector(rad*math.cos(startang*math.pi/180),rad*math.sin(startang*math.pi/180),0)
	V2 = Base.Vector(rad*math.cos(midang*math.pi/180),rad*math.sin(midang*math.pi/180),0)
	V3 = Base.Vector(rad*math.cos(finishang*math.pi/180),rad*math.sin(finishang*math.pi/180),0)
	return Part.Arc(V1, V2, V3)

def makePoly(bvecs, autoClose = False):
	lvecs = []
	for v in bvecs:
		lvecs.append(Base.Vector(v[0],v[1],v[2]))
	if autoClose:
		lvecs.append(lvecs[0])
	return Part.makePolygon(lvecs)

def makePlate(bvecs, extrudeVec, autoClose = False):
	lvecs = []
	for v in bvecs:
		lvecs.append(Base.Vector(v[0],v[1],v[2]))
	if autoClose:
		lvecs.append(lvecs[0])
	pol = Part.makePolygon(lvecs)
	return Part.Face(Part.Wire(pol)).extrude(extrudeVec)

def makeDrop(rad, height, ang):
	a1 = 90-ang
	a2 = 90+ang
	y = rad/math.cos(ang*math.pi/180)
	p1 = [rad*math.cos(a1*math.pi/180),rad*math.sin(a1*math.pi/180),0.0]
	p2 = [0.0, y, 0.0]
	p3 = [rad*math.cos(a2*math.pi/180),rad*math.sin(a2*math.pi/180),0.0]
	pol = makePoly([p1,p2,p3])
	arc = ArcGreatAngle(rad,a1,a2).toShape()
	return Part.Face(Part.Wire([pol,arc])).extrude(VZ*height)

def makeRing(rext, rint, height):
	c = Part.makeCylinder(rext, height)
	return c.cut(Part.makeCylinder(rint, height))

class group(object):
	def __init__(self, partsDict = {}):
		"""Classe para criacao e transformacao de grupos como um todo."""
		self.partsDict = partsDict #dicionario de partes
	def add(part, partName):
		self.partsDict[partName] = part
	def translate(self, bVec):
		for p in self.partsDict:
			self.partsDict[p].translate(bVec)
	def rotate(self, bVecOrig, bVecAxis, angle):
		for p in self.partsDict:
			self.partsDict[p].rotate(bVecOrig, bVecAxis, angle)

class document(object):
	def __init__(self, name = 'Document'):
		"""Classe para criacao de documentos gerais no FreeCAD."""
		self.doc = FreeCAD.newDocument(name)
		self.featuresDict = {}
	def includeFeature(self, feature, featureName):
		x = self.doc.addObject("Part::Feature",featureName)
		x.Shape = feature
		self.featuresDict[featureName] = x
	def includeGroup(self, partsDict, groupName):
		group = self.doc.addObject('App::DocumentObjectGroup', groupName)
		for pName in partsDict:
			self.includeFeature(partsDict[pName], pName)
			group.addObject(self.doc.getObject(pName))
	def addTechDraw(self, featuresList = 'allFeatures', direction = (1.0, 1.0, 1.0), scale = 0.05, pageName = 'Page', templateName = 'Template', viewName = 'View'):
		page = self.doc.addObject('TechDraw::DrawPage', pageName)
		template = self.doc.addObject('TechDraw::DrawSVGTemplate', templateName)
		template.Template = '/tmp/.mount_FreeCA3rQBHp/usr/data/Mod/TechDraw/Templates/A4_LandscapeTD.svg'
		page.Template = template
		view = self.doc.addObject('TechDraw::DrawViewPart', viewName)
		page.addView(view)
		if featuresList == 'allFeatures':
			view.Source = [self.featuresDict[x] for x in self.featuresDict]
		else:
			view.Source = featuresList
		view.Direction = direction
		view.Scale = scale
	def setColor(self, featureName, r, g, b):
		self.featuresDict[featureName].ViewObject.ShapeColor = (r,g,b)




#****************************************
# Horus design for the Stellector Project
#****************************************

#Unidades: milimetros

#Tolerancia da impressora 3D:
tol = 0.25

#Motor de passo 28BYJ-48:
mp_rad = 14.0+tol/2
mp_par_centro = 17.5
mp_par_rad_ext = 3.5
mp_par_rad_int = 2.1+tol/2
mp_prof = 19.0
mp_eixo_chanfro_comp = 6.0
mp_basecabo_alt = 17.0
mp_basecabo_lar = 14.6
mp_basecabo_prof = 5.9
mp_basecabo_rad = math.sqrt((mp_basecabo_lar/2)**2+mp_basecabo_alt**2)
mp_conector_lar = 15.0
mp_conector_alt = 6.0
mp_rad_eixo = 2.5+tol/2
mp_sep_eixo = 4.0+tol
mp_comp_eixo = 6.0
mp_acha_eixo = 3.0+tol - 0.2   #largura da parte achatada do eixo  (0.2 é o fator de correção obtido após impressão da peça)
mp_desl_eixo = 8.0   #deslocamento do eixo em relacao ao centro do motor

#Rolamento:
rol_rad_int = 4.55/2 + 0.45/2  #0.45 é o fator de correção obtido após impressão da peça
rol_rad_ext = 9.45/2 + tol/2
rol_rad_a_ext = 6.0/2 + tol/2
rol_lar = 3.05 + tol/2

#Parafuso do laser (M4):
diam_par = 2.5
passo_par = 0.7
comp_par = 5.0

#Pés de nivelamento:
diam_nivel = 11.0

#Sensor de distancia ultrassonico:
sep_ultra_par_suporte = 80.0 #distancia minima entre o sensor ultrassonico e o parafuso do suporte de forma a não haver obstrução em direção ao solo.

#Rosca e pino do tripe:
diam_pino = 4.0  #diâmetro do pino retrátil
diam_porca_sextavada = 12.4
alt_porca_sextavada = 5.5
passo_par_suporte = 1.25
comp_par_suporte = 6.0
sep_pino_par = 14.0 #separação do pino retrátil ao parafuso do suporte
diam_par_suporte = 6.1 #diâmetro externo do parafuso do suporte (contando com a rosca)

#Suporte movel:
sm_cB_rad_int = mp_rad
sm_cB_prof = 15.0
sm_cB_rad_ext = 6.0 + mp_par_centro + mp_par_rad_ext
sm_cB_ressalto_ang = 120.0
sm_cB_basecabo_lar = mp_conector_lar + 1.0

#Protetor do cabo:
sm_prot_cabo_lar = sm_cB_basecabo_lar
sm_prot_cabo_esp = 3.0
sm_prot_cabo_prof = 2.0
sm_prot_cabo_comp = mp_conector_alt + 1.0

#Laser:
laser_rad = 6.0 + tol/2
laser_comp_circuito = 19.0
laser_comp_metal_liso = 24.5
laser_comp_metal_rosca = 10.5
laser_comp = laser_comp_circuito+laser_comp_metal_liso+laser_comp_metal_rosca

#Suporte laser:
sl_rad_int = laser_rad
sl_rad_ext = laser_rad + 2.0
sl_sep_suporte = 5.0
sl_eixo_comp = 2*sl_rad_ext + 2*sl_sep_suporte
sl_eixo_rad = 2*mp_rad_eixo
sl_rol_esp = 2.0

#Suporte eixo laser:
sel_alt = 2*sl_eixo_rad
sel_esp = 4.0
sel_comp = laser_comp + 2*6.0
sel_lar = sl_eixo_comp + mp_sep_eixo

#Bateria Power Bank 10000 mAh:
Batt = {	'com': 155.5,	#comprimento
			'lar': 77.2,	#largura
			'alt': 12.15,	#altura
			'fendaSaidaLar': 10.0,	#largura da fenda do cabo de saída de energia
			'fendaSaidaCom': 4.0,	#comprimento da fenda do cabo de saída de energia
			'fendaEntLar': 15.0,	#largura da fenda do cabo de entrada de energia
			'fendaCentCom': 17.0,	#centro da fenda do cabo de entrada de energia em relação à borda longitudinal da bateria
			'fendaCentAlt': 5.0,	#centro da fenda do cabo de entrada de energia em relação à base da bateria
			'fendaExt': 30.0}		#extensão da fenda do cabo de entrada de energia em relação à base da bateria

#ESP32:
ESP32 = {	'com': 65.0,		#comprimento
			'lar': 30.0,		#largura
			'sepCom': 51.0,		#separacao dos parafusos no comprimento
			'sepLar': 23.0,		#separacao dos parafusos na largura
			'par': 2.75}		#diametro dos furos dos parafusos

#Sensor ultrassonico HC-SR04:
Ultra = {	'com': 45.0,		#comprimento
			'lar': 20.0,		#largura
			'erDiam': 16.0,		#diametro do emissor e receptor
			'erSep': 26.0,		#separacao entre o centro do emissor e receptor
			'sepCom': 41.0,		#separacao dos parafusos no comprimento
			'sepLar': 16.5,		#separacao dos parafusos na largura
			'par': 2.0}			#diametro dos furos dos parafusos

#Magnetometro GY-282:
#Magnet = {	'com': 18.0,		#comprimento
#			'lar': 14.0,		#largura
#			'sepCom': 13.0,		#separacao dos parafusos no comprimento
#			'sepLar': 9.0,		#separacao dos parafusos na largura
#			'par': 3.0}			#diametro dos furos dos parafusos

#Magnetometro-Acelerômetro GY-511:
Magnet = {	'com': 20.5,		#comprimento
			'lar': 14.5,		#largura
			'sepCom': 15.1,		#separacao dos parafusos no comprimento
			'dlar': 9.0,		#distancia do centro dos parafusos a borda no sentido da largura
			'par': 3.0}			#diametro dos furos dos parafusos

#Acelerometro MPU6050:
Aceler = {	'com': 20.3,		#comprimento
			'lar': 15.6,		#largura
			'dcom': 2.5,		#distancia do centro dos parafusos a borda no sentido do comprimento
			'dlar': 2.5,		#distancia do centro dos parafusos a borda no sentido da largura
			'par': 3.0}			#diametro dos furos dos parafusos

#Driver motor de passo:
Driver = {	'sepLar': 27.0,	#separacao dos parafusos na largura
			'par': 2.75}	#diametro dos furos dos parafusos

#Display oled 0.96'':
Display = {	'com': 30.0,		#comprimento da placa
			'lar': 27.0,		#largura da placa
			'dispCom': 21.7,	#comprimento do display
			'dispLar': 10.9,	#largura do display
			'dispAlt': 1.65,	#altura do display
			'dispBase': 7.2,	#altura do início do display em relação ao início da placa
			'sepCom': 22.0,	#separacao dos parafusos no comprimento
			'sepLar': 22.0,	#separacao dos parafusos na largura
			'par': 2.0}		#diametro dos furos dos parafusos

#Interruptor de energia:
Interr = {	'lar': 19.0,	#largura por trás da moldura
			'alt': 12.8}		#altura por trás da moldura}

Torre = {	'l1': 15.0,			#comprimento do pé da Torre
			'l2':  Batt['lar'],	#comprimento da base interna da Torre
			'h1': 48.0,
			'h2': 7.0,
			'h3': 75.0,
			'r1': 10.0,			#raio do disco de suporte do rolamento
			'e': 4.0,			#espessura
			'lar': sm_cB_prof,		#largura
			'com': Batt['lar'],
			'par': 3.5}			#diâmetro dos furos da base

#Base octagonal da montagem:
BaseM = {	'N': 8,							#numero de lados da base
			'larInt': Batt['com'] + 40.0,	#largura interna do octogono
			'larExt': Batt['com'] + 60.0,	#largura externa do octogono (borda)
			'espes': 18.0,					#espessura da baseOctagonal
			'profBat': Batt['alt'] + 1.0,	#profundidade do vale da bateria
			'sepTorres': 84.0 + mp_sep_eixo}				#separação entre as faces internas das torres de sustentação dos motores de passo


#Parafuso auto atarrachante 2.2 curto:
Par2p2 = {	'diam': 1.6,	#diâmetro da raiz do parafuso
			'com': 6.5}			#comprimento}
#Parafuso auto atarrachante 2.9 curto:
Par2p9c = {	'diam': 2.2,	#diâmetro da raiz do parafuso
			'com': 6.5}		#comprimento}
#Parafuso auto atarrachante 2.9 longo:
Par2p9l = {	'diam': 2.2,	#diâmetro da raiz do parafuso
			'com': 9.5}		#comprimento}

#Pino eixo macho:
inc = 30.0*math.pi/180 #Angulo de inclinacao para evitar uso de suporte
x = mp_acha_eixo/2
r = mp_rad_eixo
y1 = math.sqrt(r**2-x**2)
y2 = x*math.tan(inc)
pol = makePoly([[x,-y1,0.0],[x,y1,0.0],[0.0,y1+y2,0.0],[-x,y1,0.0],[-x,-y1,0.0]])
a = math.asin(y1/r)*180/math.pi
arc = ArcAngle(r,a+180.0,360.0-a).toShape()
e_macho = Part.Face(Part.Wire([pol,arc])).extrude(VZ*mp_comp_eixo)

#Suporte motor móvel:
SM_cB_ext = Part.makeCylinder(sm_cB_rad_ext, sm_cB_prof)
SM_cB_int = Part.makeCylinder(sm_cB_rad_int, sm_cB_prof)
SM_cB = SM_cB_ext.cut(SM_cB_int)

##Furos dos parafusos
F1 = Part.makeCylinder(mp_par_rad_int,sm_cB_prof)
F1.translate(vecX(mp_par_centro))
F2 = Part.makeCylinder(mp_par_rad_int,sm_cB_prof)
F2.translate(vecX(-mp_par_centro))

##Abertura de espaco para encaixe do motor no eixo
C1 = ArcAngle(mp_rad, -90-sm_cB_ressalto_ang/2, -90+sm_cB_ressalto_ang/2).toShape()
C2 = ArcAngle(mp_par_centro+mp_par_rad_ext+1.0+tol, -90-sm_cB_ressalto_ang/2, -90+sm_cB_ressalto_ang/2).toShape()
L1 = Part.LineSegment(C1.Vertexes[0].Point,C2.Vertexes[0].Point).toShape()
L2 = Part.LineSegment(C1.Vertexes[1].Point,C2.Vertexes[1].Point).toShape()
F3 = Part.Face(Part.Wire([C1,L2,C2,L1])).extrude(vecZ(sm_cB_prof))
F4 = F3.copy()
F4.rotate(V0, vecZ(1),180)

##Espaco para o cabo
B1 = Part.makeBox(sm_cB_basecabo_lar,sm_cB_rad_ext-mp_basecabo_alt,mp_basecabo_prof)
B1.translate(Base.Vector(-sm_cB_basecabo_lar/2,-sm_cB_rad_ext,sm_cB_prof-mp_basecabo_prof))

##Apoio para o cabo
dy = (sm_cB_rad_ext-sm_cB_rad_int)/2
p1 = [0,0,0]
p2 = [-sm_prot_cabo_esp,0,0]
p3 = [-sm_prot_cabo_esp,-sm_prot_cabo_comp-dy-sm_prot_cabo_esp,0]
p4 = [sm_prot_cabo_lar+sm_prot_cabo_esp,-sm_prot_cabo_comp-dy-sm_prot_cabo_esp,0]
p5 = [sm_prot_cabo_lar+sm_prot_cabo_esp,0,0]
p6 = [sm_prot_cabo_lar,0,0]
p7 = [sm_prot_cabo_lar,-sm_prot_cabo_comp-dy,0]
p8 = [0,-sm_prot_cabo_comp-dy,0]
A1 = Part.Face(makePoly([p1,p2,p3,p4,p5,p6,p7,p8,p1])).extrude(vecZ(-sm_prot_cabo_prof))
A1.translate(Base.Vector(-sm_prot_cabo_lar/2,-(sm_cB_rad_ext+sm_cB_rad_int)/2,sm_cB_prof))

SM_cB0 = SM_cB.cut(F1).cut(F2).cut(F3).cut(F4)
SM_cB = SM_cB0.cut(B1).fuse(A1)

##Apoio para o eixo
larg_engate = 3.0
B1 = Part.makeBox(sel_comp+2*sel_esp,sel_lar+2*sel_esp,sel_alt)
B2 = Part.makeBox(sel_comp,sel_lar,sel_alt)
B2.translate(Base.Vector(sel_esp,sel_esp,0))
B3 = Part.makeBox(sel_comp-sm_cB_prof-larg_engate,sel_esp,sel_alt)
B3.translate(vecX(((sel_comp+2*sel_esp)-(sel_comp-sm_cB_prof-larg_engate))/2))
B1 = B1.cut(B2).cut(B3)
B1.rotate(V0, vecX(1), 90)
B1.translate(Base.Vector(-sel_comp/2-sel_esp,sel_alt/2,sm_cB_prof-sel_esp))

C1 = makeDrop(rol_rad_ext, rol_lar, 30.0)
C1.translate(Base.Vector(0,mp_desl_eixo,sm_cB_prof+sel_lar))
sobra_rol = Part.makeBox(3*rol_rad_ext,sel_alt/2+mp_desl_eixo,sel_esp+2.0)
sobra_rol.translate(Base.Vector(-3*rol_rad_ext/2,-sel_alt/2,sm_cB_prof+sel_lar))
sobra_circ = Part.makeCylinder(3*rol_rad_ext/2,sel_esp+2.0)
sobra_circ.translate(Base.Vector(0,mp_desl_eixo,sm_cB_prof+sel_lar))

B4 = Part.makeBox(larg_engate,sel_alt,sm_cB_prof*0.75)
B4.translate(Base.Vector(-sm_cB_rad_ext,-sel_alt/2,sm_cB_prof-sm_cB_prof*0.75))
B4 = B4.common(Part.makeCylinder(sm_cB_rad_ext,sm_cB_prof))
B5 = B4.copy()
B5.rotate(V0,vecZ(1),180)
B1 = B1.fuse(sobra_rol).fuse(sobra_circ).cut(C1).fuse(B4).fuse(B5)

#Procedimento para incluir a tolerância da impressora no recorte do suporte do motor
B4l = Part.makeBox(larg_engate+tol,sel_alt+tol,sm_cB_prof*0.75+tol)
B4l.translate(Base.Vector(-sm_cB_rad_ext-tol/2,-sel_alt/2-tol/2,sm_cB_prof-sm_cB_prof*0.75-tol/2))
B5l = B4l.copy()
B5l.rotate(V0,vecZ(1),180)
B1l = B4l.fuse(B5l)

furoParSEL1a = makeDrop(Par2p2['diam']/2+tol/2,4*larg_engate,30)
furoParSEL1a.rotate(V0,VY,90)
furoParSEL1a.translate(VX*mp_par_centro + VZ*(sm_cB_prof*0.5))
furoParSEL2a = mirrorX(furoParSEL1a)

SupEixoLaser = B1.cut(furoParSEL1a).cut(furoParSEL2a).removeSplitter()

furoParSEL1b = makeDrop(Par2p2['diam']/2+tol/2,4*larg_engate,30)
furoParSEL1b.rotate(V0,VZ,90)
furoParSEL1b.rotate(V0,VY,90)
furoParSEL1b.translate(VX*mp_par_centro + VZ*(sm_cB_prof*0.5))
furoParSEL2b = mirrorX(furoParSEL1b)

SM_cB = SM_cB.cut(B1l).cut(furoParSEL1b).cut(furoParSEL2b).removeSplitter()


#Suporte Laser

## Prendedor do laser
f = 0.85
SL_cB = Part.makeCylinder(sl_rad_ext,f*laser_comp)
SL_base = Part.makeCylinder(sl_rad_ext,sl_rad_ext-sl_rad_int)
SL_base = SL_base.cut(Part.makeCylinder(3.5,sl_rad_ext-sl_rad_int))
SL_cB = SL_cB.cut(Part.makeCylinder(sl_rad_int,0.85*laser_comp)).fuse(SL_base)

espesAcel = 2.0
sobra = 2.0
scom = 3.0
acom = Aceler['com']+scom
dcom = Aceler['dcom']+scom/2
larAcel = Aceler['dlar']+Aceler['par']/2 + sobra + 2.5
encaixeAcel = Part.makeBox(larAcel,acom,espesAcel)
furoAcel1 = makeDrop(Aceler['par']/2+tol/2, espesAcel, 30)
furoAcel2 = furoAcel1.copy()
furoAcel1.translate(VX*(Aceler['dlar']+sobra)+VY*dcom)
furoAcel2.translate(VX*(Aceler['dlar']+sobra)+VY*(acom-dcom))
encaixeAcel = encaixeAcel.cut(furoAcel1).cut(furoAcel2)
encaixeAcel.rotate(V0,VX,90)
encaixeAcel.translate(VX*(sl_rad_ext-1.0)+VY*2.5+VZ*(f*laser_comp-acom)/2)
encaixeAcel.rotate(V0,VZ,-90)
SL_cB = SL_cB.fuse(encaixeAcel)

SL_cB.rotate(vecZ(laser_comp/2), vecY(1), 90)
borda_parafuso = Part.makeCylinder(2.0+Par2p2['diam']/2+tol/2,laser_rad+Par2p2['com']/2)
furo_parafuso = makeDrop(Par2p2['diam']/2+tol/2,laser_rad+Par2p2['com']/2,30)
furo_parafuso.rotate(V0,VZ,-90)
furo_parafuso.rotate(V0,vecX(1),-90)
furo_parafuso.translate(vecZ(laser_comp/2))
borda_parafuso.rotate(V0,vecX(1),-90)
borda_parafuso.translate(vecZ(laser_comp/2))

SL_cB = SL_cB.fuse(borda_parafuso).cut(furo_parafuso)
SL_cB.translate(vecZ(sm_cB_prof+sel_lar/2-laser_comp/2+2.5))


## Eixo de rotacao do laser
SL_cE = Part.makeCylinder(sl_eixo_rad,sl_eixo_comp-sl_rol_esp)
SL_cEr = Part.makeCylinder(rol_rad_a_ext,sl_rol_esp)
SL_cEr.translate(vecZ(sl_eixo_comp-sl_rol_esp))
SL_cEe = Part.makeCylinder(rol_rad_int-tol/2,rol_lar-tol)
SL_cEe.translate(vecZ(sl_eixo_comp))
SL_cE = SL_cE.fuse(SL_cEr).fuse(SL_cEe)
SL_cE.translate(vecZ(sm_cB_prof+mp_sep_eixo))
miolo = Part.makeCylinder(sl_rad_int+0.05,0.75*laser_comp)
miolo.rotate(vecZ(laser_comp/4), vecY(1), 90)
miolo.translate(vecZ(sm_cB_prof+sel_lar/2-laser_comp/4+2.5))
furo_eixo = e_macho.copy()
furo_eixo.rotate(V0, VZ, -90)
furo_eixo.translate(Base.Vector(0,0,sm_cB_prof+mp_sep_eixo))
#SL = SL_cB.fuse(SL_cE).cut(miolo).cut(furo_eixo).removeSplitter()
SL = SL_cB.fuse(SL_cE).cut(furo_eixo)
#SL = Part.makeSolid(SL)
SL = SL.cut(miolo).removeSplitter()
SL.translate(vecY(mp_desl_eixo))

face = SupEixoLaser.Faces[7]
eixo_fixo_femea = Part.makeCylinder(lenY(face)/2, mp_comp_eixo-2.0) # -2.0 é o fator de correção obtido após impressão da peça
eixo_fixo_femea = eixo_fixo_femea.cut(e_macho)
eixo_fixo_femea.rotate(V0, vecY(1), -90)
eixo_fixo_femea.translate(center(face) - vecZ(0.35 * lenZ(face)) + vecX(mp_comp_eixo - 2.0))  # -2.0 é o fator de correção obtido após impressão da peça

# e_machoC é fator de correção obtido após impressão da peça:
e_machoC = e_macho.copy()
e_machoC.rotate(V0, vecY(1), -90)
e_machoC.translate(center(face) - vecZ(0.35 * lenZ(face)) + vecX(mp_comp_eixo - 2.0))  # -2.0 é o fator de correção obtido após impressão da peça

eixo_fixo_macho = Part.makeCone(lenY(face)/2,rol_rad_a_ext,mp_comp_eixo)
eixo_fixo_macho1 = Part.makeCylinder(rol_rad_int-tol/2,rol_lar-tol)
eixo_fixo_macho1.translate(vecZ(lenZ(eixo_fixo_macho)))
eixo_fixo_macho = eixo_fixo_macho.fuse(eixo_fixo_macho1)
eixo_fixo_macho.rotate(V0, vecY(1), -90)
face = SupEixoLaser.Faces[1]
eixo_fixo_macho.translate(center(face)-vecZ(0.35*lenZ(face)))

SupEixoLaser = SupEixoLaser.fuse(eixo_fixo_femea).fuse(eixo_fixo_macho).cut(e_machoC)

def encaixePar(rext, rint, hfora, hdentro):
	'''Encaixe de parafuso saliente'''
	eps = 0.01
	ce = Part.makeCylinder(rext, hfora+hdentro+eps)
	ci = Part.makeCylinder(rint, hfora+hdentro+eps)
	ci.translate(VZ*eps)
	c = ce.cut(ci)
	c.translate(-VZ*(hdentro+eps))
	return c

def basePart():
	#Base octagonal
	r = BaseM['larExt']/(2*math.cos(math.pi/BaseM['N']))
	da = 2*math.pi/BaseM['N']
	p = [[r*math.cos(i*da), r*math.sin(i*da), 0.0] for i in range(BaseM['N'])]
	pol = makePoly(p, autoClose = True)
	base = Part.Face(Part.Wire(pol)).extrude(VZ*BaseM['espes'])
	base.rotate(V0, VZ, 180.0/BaseM['N'])

	#Case da bateria
	dBatX = 6.0		#deslocamento do conjunto da bateria
	x, y, z = Batt['com']+1+tol, Batt['lar']+1+tol, BaseM['profBat']
	batCase = Part.makeBox(x, y, z)
	batCase.translate(Base.Vector(-x/2+dBatX, -y/2, BaseM['espes']-z))

	#Fenda do cabo de saída da alimentação
	xf, yf, zf = Batt['fendaSaidaCom']+tol, Batt['fendaSaidaLar']+tol, BaseM['profBat']
	fendaSaida = Part.makeBox(xf,yf,zf)
	fendaSaida.translate(Base.Vector(-x/2-xf+dBatX, -y/2, BaseM['espes']-z))

	#Fenda do cabo de entrada de alimentação
	xe, ye, ze = Batt['fendaEntLar']+tol, Batt['fendaExt'], BaseM['espes']
	fendaEntrada = Part.makeBox(xe,ye,ze)
	polincl = [[0,0,0],[0,0,ze],[0,-ze,0]]
	inclFenda = makePlate(polincl,VX*xe, autoClose=True)
	fendaEntrada = fendaEntrada.fuse(inclFenda)
	fendaEntrada.translate(Base.Vector(-x/2+Batt['fendaCentCom']-xe/2+dBatX, -y/2-ye, 0.0))

	#Apoio do interruptor de energia:
	espes = 10.0
	larBase = Interr['lar'] + tol + 2*espes
	polBase = makePoly([[0,0,0],[espes,0,0],[0,0,espes]], autoClose=True)
	apoioBase = Part.Face(Part.Wire(polBase)).extrude(VY*larBase)
	apoioBase.translate(-VY*larBase/2)
	polLateral = makePoly([[0,0,0],[espes,0,0],[0,espes,0]], autoClose=True)
	apoioLateral1 = Part.Face(Part.Wire(polLateral)).extrude(VZ*(espes+Interr['alt']+tol))
	apoioLateral1.translate(-VY*larBase/2)
	apoioLateral2 = mirrorY(apoioLateral1)
	apoioInterr = apoioBase.fuse(apoioLateral1).fuse(apoioLateral2)
	apoioInterr.translate(-VX*BaseM['larInt']/2 + VZ*BaseM['espes'])

	#Apoio do display:
	espes = 3.0
	lar = 10.0
	altIni = 3.0
	recuo = 5.0
	alt = altIni+Display['lar']+3.0
	haste = Part.makeBox(lar,espes,alt)
	suporte = makePlate([[0,espes,0],[0,espes,alt],[0,espes+lar,0]],VX*espes,autoClose=True)
	haste = haste.fuse(suporte)
	haste.translate(-VX*(Display['sepCom']/2+3*Display['par']))
	furo1 = makeDrop(tol/2+Display['par']/2,espes,30)
	furo1.rotate(V0,VZ,180)
	furo1.rotate(V0,VX,-90)
	furo2 = furo1.copy()
	furo1.translate(Base.Vector(-Display['sepCom']/2,0,altIni+(Display['lar']-Display['sepLar'])/2))
	furo2.translate(Base.Vector(-Display['sepCom']/2,0,altIni+(Display['lar']+Display['sepLar'])/2))
	haste1 = haste.cut(furo1).cut(furo2)
	haste2 = mirrorX(haste1)
	apoioDisp = haste1.fuse(haste2)
	rd = BaseM['larInt']/2 - recuo
	apoioDisp.translate(-VY*rd + VZ*BaseM['espes'])
	apoioDisp.rotate(V0,VZ,360.0/BaseM['N'])

	#Encaixe Ultrassom:
	epesAnelPar = 1.0
	altAnelParFora = Par2p2['com'] - 1.5
	centroY = BaseM['larInt']/2-Ultra['lar']/2 - 5.0
	rint = Par2p2['diam']/2 + tol/2
	rext = rint + epesAnelPar
	par1 = makeRing(rext, rint, altAnelParFora)
	par1.translate(VX*Ultra['sepCom']/2 - VY*Ultra['sepLar']/2)
	par2 = par1.copy()
	par2.rotate(V0,VZ,180)
	parUltra = par1.fuse(par2)
	parUltra.translate(VY*centroY+VZ*BaseM['espes'])
	furo = Ultra['erDiam']/2 + tol + 0.35
	furoEmRe1 = Part.makeCone(furo+0.75*BaseM['espes'], furo, BaseM['espes'])
	furoEmRe1.translate(VX*Ultra['erSep']/2 + VY*centroY)
	furoEmRe2 = mirrorX(furoEmRe1)
	furoEmRe = furoEmRe1.fuse(furoEmRe2)

	#Encaixe ESP32:
	epesAnelPar = 1.5
	altAnelParFora = Par2p9c['com'] - 1.5
	centroY = -BaseM['larInt']/2 + ESP32['lar']/2 + 5.0
	rint = Par2p9c['diam']/2 + tol/2
	rext = rint + epesAnelPar
	par1 = makeRing(rext, rint, altAnelParFora)
	par2 = par1.copy()
	par1.translate(VX*ESP32['sepCom']/2 - VY*ESP32['sepLar']/2)
	par2.translate(VX*ESP32['sepCom']/2 + VY*ESP32['sepLar']/2)
	par3 = par1.fuse(par2)
	par4 = mirrorX(par3)
	parESP32 = par4.fuse(par3)
	parESP32.translate(VY*centroY+VZ*BaseM['espes'])

	#Encaixe Magnetômetro-Acelerômetro:
	epesAnelPar = 1.0
	altAnelParFora = Par2p9c['com'] - 1.5
	centroY = BaseM['larInt']/2-Magnet['lar']/2 - 20.0
	rint = Par2p9c['diam']/2 + tol/2
	rext = rint + epesAnelPar
	par1 = makeRing(rext, rint, altAnelParFora)
	par1.translate(VX*Magnet['sepCom']/2 - VY*Magnet['dlar'])
	par2 = mirrorX(par1)
	parMagnet = par1.fuse(par2)	
	parMagnet.translate(VY*centroY+VZ*BaseM['espes'])

	#Furo Torres:
	l1, l2, h1, h2, h3, e = Torre['l1'], Torre['l2'], Torre['h1'], Torre['h2'], Torre['h3'], Torre['e']
	h = h1 + h2 + h3
	tan = h/(l2/2)
	eh = e/math.sin(math.atan(tan))
	furot1 = Part.makeCylinder(Torre['par']/2+tol/2,Torre['e']+BaseM['espes'])
	furot2 = furot1.copy()
	furot1.translate(-VX*(BaseM['sepTorres']/2+Torre['lar']/2) - VY*(l2/2+eh+l1/2))
	furot2.translate(VX*(BaseM['sepTorres']/2+Torre['lar']/2) - VY*(l2/2+eh+l1/2))
	furota = furot1.fuse(furot2)
	furotb = mirrorY(furota)
	furoDeslocado = Part.makeCylinder(Torre['par']/2+tol/2,BaseM['espes'])
	furoDeslocado.translate(-VX*(BaseM['sepTorres']/2+Torre['lar']/2) - VY*(l2/2+eh+l1/2))
	furoDeslocado.translate(VX*1.0*Torre['lar'] + 0*VY*l1/2)
	furotb = furotb.fuse(furoDeslocado)

	#Furos parafusos do Tripé:
	alt_furo_porca = BaseM['espes']-2.0
	cX = Batt['lar']/2+diam_porca_sextavada/2+5.0
	furoParTripe = Part.makeCylinder(diam_par_suporte/2+tol, BaseM['espes'])
	furoPinoTripe = Part.makeCylinder(diam_pino/2+tol, BaseM['espes'])
	furoPinoTripe.translate(VY*sep_pino_par)
	N = 6
	r = tol/2+diam_porca_sextavada/2
	da = 2*math.pi/N
	p = [[r*math.cos(i*da), r*math.sin(i*da), 0.0] for i in range(N)]
	porca = makePlate(p, VZ*alt_furo_porca, autoClose = True)
	porca.translate(VZ*(BaseM['espes']-alt_furo_porca))
	furosTripe = furoParTripe.fuse(furoPinoTripe).fuse(porca)
	furosTripe.translate(-VY*cX)

	#Furos parafusos de nivelamento:
	furoNivel1 = Part.makeCylinder(diam_nivel/2+tol/2,BaseM['espes'])
	furoNivel3 = furoNivel1.copy()
	furoNivel1.translate(VX*(BaseM['larInt']/2-diam_nivel/2-2.0))
	furoNivel3.translate(-VX*(BaseM['larInt']/2-diam_nivel/2-12.0))
	furoNivel2 = furoNivel1.copy()
	furoNivel1.rotate(V0,VZ,-63)
	furoNivel2.rotate(V0,VZ,55)
	furosNivel = furoNivel1.fuse(furoNivel2).fuse(furoNivel3)

	#Furos de fixação do envólucro:
	furoEnvo1 = Part.makeCylinder(Par2p9l['diam']/2+tol/2,BaseM['espes'])
	furoEnvo1.translate(VX*(BaseM['larExt']/2-(BaseM['larExt']-BaseM['larInt'])/4))
	furoEnvo2 = furoEnvo1.copy()
	furoEnvo3 = furoEnvo1.copy()
	furoEnvo4 = furoEnvo1.copy()
	furoEnvo2.rotate(V0,VZ,90)
	furoEnvo3.rotate(V0,VZ,180)
	furoEnvo4.rotate(V0,VZ,270)
	furosEnvo = furoEnvo1.fuse(furoEnvo2).fuse(furoEnvo3).fuse(furoEnvo4)

	base = base.cut(batCase).cut(fendaSaida).cut(fendaEntrada).fuse(apoioInterr).fuse(apoioDisp).fuse(parUltra).fuse(parESP32).fuse(parMagnet).cut(furoEmRe)
	base = base.cut(furota).cut(furotb).cut(furosTripe).cut(furosNivel).cut(furosEnvo)
	return base.removeSplitter()

def torreRolPart():
	l1, l2, h1, h2, h3, e = Torre['l1'], Torre['l2'], Torre['h1'], Torre['h2'], Torre['h3'], Torre['e']
	h = h1 + h2 + h3
	tan = h/(l2/2)
	y1, y2 = h1/tan, (h1+h2)/tan
	eh = e/math.sin(math.atan(tan))
	l = 2*l1+2*eh+l2
	pe = [[0,0,0],[0,l,0],[0,l,e],[0,l-l1,e],[0,l/2+eh,h+e],[0,l/2-eh,h+e],[0,l1,e],[0,0,e]]
	pole = makePlate(pe, VX*Torre['lar'], autoClose=True)
	pi1 = [[0,l1+eh,e],[0,l1+eh+l2,e],[0,l1+eh+l2-y1,h1+e],[0,l1+eh+y1,h1+e]]
	poli1 = makePlate(pi1, VX*Torre['lar'], autoClose=True)
	pi2 = [[0,l1+eh+y2,e+h1+h2],[0,l/2,h+e],[0,l-l1-eh-y2,e+h1+h2]]
	poli2 = makePlate(pi2, VX*Torre['lar'], autoClose=True)
	torre = pole.cut(poli1).cut(poli2)

	discoi = Part.makeCylinder(rol_rad_ext, rol_lar)
	espes = Torre['lar']#rol_lar + 4.0
	discoe = Part.makeCylinder(Torre['r1'], espes)
	discoi.translate(VZ*(espes-rol_lar))
	disco = discoe.cut(discoi)
	disco.rotate(V0,VY,90)
	disco.translate(VY*(l/2)+VZ*h)
	discoe.rotate(V0,VY,90)
	discoe.translate(VY*(l/2)+VZ*h)

	furoBase1 = makeDrop(Torre['par']/2+tol/2,e,30)
	furoBase1.rotate(V0,VZ,-90)
	furoBase2 = furoBase1.copy()
	furoBase1.translate(VX*Torre['lar']/2 + VY*l1/2)
	furoBase2.translate(VX*Torre['lar']/2 + VY*(l-l1/2))

	#Encaixe Driver:
	epesAnelPar = 1.0
	altAnelParFora = Par2p9c['com'] - 1.5
	rint = Par2p9c['diam']/2 + tol/2
	rext = rint + epesAnelPar
	par1 = makeRing(rext, rint, altAnelParFora)
	par1.rotate(V0,VY,90)
	par2 = par1.copy()
	par1.translate(VX*Torre['lar'] + VY*(l/2-Driver['sepLar']/2) + VZ*(e+h1+h2/2))
	par2.translate(VX*Torre['lar'] + VY*(l/2+Driver['sepLar']/2) + VZ*(e+h1+h2/2))

	torre = torre.cut(discoe).fuse(disco).cut(furoBase1).cut(furoBase2).fuse(par1).fuse(par2)
	torre.translate(VX*(-BaseM['sepTorres']/2-Torre['lar']) - VY*l/2 + VZ*BaseM['espes'])

	#Amarra com a outra Torre:
	#dh = 5.0
	#y2l = (h1+h2+dh)/tan
	x, y, z = BaseM['sepTorres']+2*Torre['lar'], Torre['lar'], e
	amarra1 = Part.makeBox(x, y, z)
	furoama = makeDrop(3.0/2+tol/2,2*e,30)
	furoama.rotate(V0,VZ,-90)
	furoama.translate(VX*(x-Torre['lar']/2)+VY*y/2)
	amarra1 = amarra1.cut(furoama)
	amarra1.rotate(V0,VX,180*math.atan(tan)/math.pi)
	amarra1.translate(-VX*x/2 + VY*(-l2/2+y2-eh) + VZ*(h1+h2+e+BaseM['espes']))
	amarra2 = mirrorY(amarra1)
	torre = torre.fuse(amarra2).fuse(amarra1)

	return torre.removeSplitter()

def torreMotorPart():
	l1, l2, h1, h2, h3, e = Torre['l1'], Torre['l2'], Torre['h1'], Torre['h2'], Torre['h3'], Torre['e']
	h = h1 + h2 + h3
	tan = h/(l2/2)
	y1, y2 = h1/tan, (h1+h2)/tan
	eh = e/math.sin(math.atan(tan))
	l = 2*l1+2*eh+l2
	pe = [[0,0,0],[0,l,0],[0,l,e],[0,l-l1,e],[0,l/2+eh,h+e],[0,l/2-eh,h+e],[0,l1,e],[0,0,e]]
	pole = makePlate(pe, VX*Torre['lar'], autoClose=True)
	pi1 = [[0,l1+eh,e],[0,l1+eh+l2,e],[0,l1+eh+l2-y1,h1+e],[0,l1+eh+y1,h1+e]]
	poli1 = makePlate(pi1, VX*Torre['lar'], autoClose=True)
	pi2 = [[0,l1+eh+y2,e+h1+h2],[0,l/2,h+e],[0,l-l1-eh-y2,e+h1+h2]]
	poli2 = makePlate(pi2, VX*Torre['lar'], autoClose=True)
	peBat1 = Part.makeBox(2*Torre['lar'],l1,e)
	peBat2 = Part.makeBox(1.3*Torre['lar'],1.4*l1,e)
	peBat2.translate(-VY*1.4*l1)
	torre = pole.cut(poli1).cut(poli2).fuse(peBat1).fuse(peBat2)

	#Anel do motor:
	anelEspes = 5.0
	caixaCaboLar = 18.5
	caixaBaseSep = 17.0
	altRebaixo = 5.0
	anelInt = Part.makeCylinder(sm_cB_rad_int, sm_cB_prof)
	anelExt = Part.makeCylinder(sm_cB_rad_int+anelEspes, sm_cB_prof)
	orelha1e = Part.makeCylinder(mp_par_rad_ext+1.5, sm_cB_prof)
	orelha1e.translate(VX*mp_par_centro)
	orelha1i = Part.makeCylinder(mp_par_rad_int, sm_cB_prof)
	orelha1i.translate(VX*mp_par_centro)
	orelha2i = mirrorX(orelha1i)
	orelha2e = mirrorX(orelha1e)
	orelhai = orelha1i.fuse(orelha2i)
	orelhae = orelha1e.fuse(orelha2e)
	lxi, lyi, lzi = caixaCaboLar, caixaBaseSep, sm_cB_prof
	lxe, lye, lze = lxi+2*anelEspes, lyi+anelEspes, lzi
	caixaExt = Part.makeBox(lxe,lye,lze)
	caixaExt.translate(-VX*lxe/2-VY*lye)
	caixaInt = Part.makeBox(lxi,lyi,lzi)
	caixaInt.translate(-VX*lxi/2-VY*lyi)
	rebaixo = Part.makeBox(lxi,lye,altRebaixo)
	rebaixo.translate(-VX*lxi/2-VY*lye+VZ*(lzi-altRebaixo))
	anelMotor = anelExt.fuse(caixaExt).fuse(orelhae).cut(anelInt).cut(caixaInt).cut(orelhai).cut(rebaixo).removeSplitter()

	anelMotor.rotate(V0,VZ,90)
	anelMotor.rotate(V0,VY,90)
	anelMotor.translate(VY*(l/2)+VZ*(h-mp_desl_eixo))
	anelInt.rotate(V0,VZ,90)
	anelInt.rotate(V0,VY,90)
	anelInt.translate(VY*(l/2)+VZ*(h-mp_desl_eixo))
	caixaExt.rotate(V0,VZ,90)
	caixaExt.rotate(V0,VY,90)
	caixaExt.translate(VY*(l/2)+VZ*(h-mp_desl_eixo))

	furoBase1 = makeDrop(Torre['par']/2+tol/2,e,30)
	furoBase1.rotate(V0,VZ,-90)
	furoBase2 = furoBase1.copy()
	furoBase1.translate(VX*1.5*Torre['lar'] + VY*l1/2)
	furoBase2.translate(VX*Torre['lar']/2 + VY*(l-l1/2))

	#Encaixe Driver:
	epesAnelPar = 1.0
	altAnelParFora = Par2p9c['com'] - 1.5
	rint = Par2p9c['diam']/2 + tol/2
	rext = rint + epesAnelPar
	par1 = makeRing(rext, rint, altAnelParFora)
	par1.rotate(V0,VY,90)
	par2 = par1.copy()
	par1.translate(VX*Torre['lar'] + VY*(l/2-Driver['sepLar']/2) + VZ*(e+h1+h2/2))
	par2.translate(VX*Torre['lar'] + VY*(l/2+Driver['sepLar']/2) + VZ*(e+h1+h2/2))

	torre = torre.cut(caixaExt).fuse(anelMotor).cut(anelInt).cut(furoBase1).cut(furoBase2).fuse(par1).fuse(par2)
	torre.translate(-VY*l/2)
	torre.rotate(V0,VZ,180)
	torre.translate(VX*(BaseM['sepTorres']/2+Torre['lar']) + VZ*BaseM['espes'])

	#Furo para amarra com a outra Torre:
	x, y = BaseM['sepTorres']+2*Torre['lar'], Torre['lar']
	furoama1 = makeDrop(3.0/2+tol/2,e,30)
	furoama1.rotate(V0,VZ,90)
	furoama1.translate(VX*(x-Torre['lar']/2)+VY*y/2-VZ*e)
	furoama1.rotate(V0,VX,180*math.atan(tan)/math.pi)
	furoama1.translate(-VX*x/2 + VY*(-l2/2+y2-eh) + VZ*(h1+h2+e+BaseM['espes']))
	furoama2 = mirrorY(furoama1)

	return torre.cut(furoama1).cut(furoama2).removeSplitter()

#Criacao do documento:
doc = document('HorusStellector')

#grupo = group({'SuporteMotorPasso': SM_cB, 'SuporteEixoLaser': SupEixoLaser, 'SuporteLaser': SL})

torre1 = torreRolPart()
torre1.rotate(V0, VZ, 180)
torre2 = torreMotorPart()
torre2.rotate(V0, VZ, 180)

grupoTorres = group({'TowerBearing': torre1, 'TowerStepper': torre2})
doc.includeGroup(grupoTorres.partsDict, 'Towers')

grupoSM = group({'StepperMob': SM_cB, 'LaserCase': SL, 'LaserShaftSupport': SupEixoLaser})
grupoSM.rotate(V0,VZ,180)
cSL = center(SupEixoLaser.Face47)
cT1 = center(torre1.Face44)
grupoSM.rotate(cSL,VX,-90)  #rotação azimutal
grupoSM.translate(VZ*(cT1[2]-cSL[2]))
doc.includeGroup(grupoSM.partsDict, 'MobSupport')

doc.includeFeature(basePart(), 'OctagonalBase')

doc.setColor('TowerStepper', 0.8,0.8,0.0)
doc.setColor('TowerBearing', 0.0,0.8,0.8)
doc.setColor('OctagonalBase', 0.8,0.0,0.8)
doc.setColor('StepperMob', 0.8,0.0,0.0)
doc.setColor('LaserShaftSupport', 0.0,0.8,0.0)
doc.setColor('LaserCase', 0.0,0.0,0.8)
