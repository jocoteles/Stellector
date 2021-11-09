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
****************************************************
Spiral coil design for the Horus Stellector Project.

The purpose of the coil is to tension the step motor
shaft in order to avoid false steps when inverting the sense of rotation.

FreeCAD Python scripting codes
*************************************************************************
"""

import sys, os
sys.path.append('/home/joao/Venus/Codigos/FreeCAD/myFreeCAD')

import math
from FreeCAD import Base
from FreeCAD import Part
import myFreeCAD as myf



#********************************************************
# Auxiliary constants, functions and classes declarations
#******************************************************** 

V0 = Base.Vector(0.0, 0.0, 0.0)
VX = Base.Vector(1.0, 0.0, 0.0)
VY = Base.Vector(0.0, 1.0, 0.0)
VZ = Base.Vector(0.0, 0.0, 1.0)

def makePlate(bvecs, extrudeVec, autoClose = False):
	lvecs = []
	for v in bvecs:
		lvecs.append(Base.Vector(v[0],v[1],v[2]))
	if autoClose:
		lvecs.append(lvecs[0])
	pol = Part.makePolygon(lvecs)
	return Part.Face(Part.Wire(pol)).extrude(extrudeVec)

def makeRing(rext, rint, height):
	c = Part.makeCylinder(rext, height)
	return c.cut(Part.makeCylinder(rint, height))

def makeFlatCoil(rint, rext, height, thickness, turns, stepsPerTurn = 50):	
	N = turns*stepsPerTurn
	da = 2.0*math.pi/stepsPerTurn
	rout = rext - thickness
	dr = (rout - rint)/(N-1)
	traj = []	
	for i in range(N+1):
		r = rint + i*dr
		traj.append([r*math.cos(i*da),r*math.sin(i*da),0])   
	for i in range(N, -1, -1):		
		r = rint + i*dr + thickness
		traj.append([r*math.cos(i*da),r*math.sin(i*da),0])   	
	return makePlate(traj, VZ*height, True)

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



#**********************************************
# Spiral coil design for the Stellector Project
#**********************************************

#Tolerancia da impressora 3D:
tol = 0.20

coilParams1 = {'rint': 10.5/2+tol/2, 'rext': 19.2 - 4.0, 'height': 5.0, 'thickness': 1.0, 'turns': 3} 
coilParams2 = {'rint': 10.5/2+tol/2, 'rext': 19.2 - 4.0, 'height': 5.0, 'thickness': 1.0, 'turns': 5} #escolhida
coilParams3 = {'rint': 10.5/2+tol/2, 'rext': 19.2 - 4.0, 'height': 5.0, 'thickness': 0.5, 'turns': 3} 
coilParams4 = {'rint': 10.5/2+tol/2, 'rext': 19.2 - 4.0, 'height': 5.0, 'thickness': 0.75, 'turns': 6} 
coilParams5 = {'rint': 10.5/2+tol/2, 'rext': 22.2 - 4.0, 'height': 5.0, 'thickness': 0.75, 'turns': 2} #escolhida para retracao
coilParams6 = {'rint': 10.5/2+tol/2, 'rext': 22.2 - 4.0, 'height': 5.0, 'thickness': 1.0, 'turns': 2}

ringParams = {'thickness': 1.0}

lingParams = {'rint': 2.1+tol/2, 'rext':4.5, 'width':4.0, 'thickness': 1.0}

#Criacao do documento:
doc = document('Mola Plana')

c = coilParams4
r = ringParams
l = lingParams
espiral = makeFlatCoil(c['rint'],c['rext'],c['height'],c['thickness'],c['turns'])
anelInterno = makeRing(c['rint']+r['thickness'],c['rint'],c['height'])

linBaseVecs = [[c['rext']-c['thickness'],l['rext'],0], [c['rext']+l['width'],l['rext'],0], [c['rext']+l['width'],-l['rext'],0], [c['rext']-c['thickness'],-l['rext'],0]]
lingueta = makePlate(linBaseVecs, VZ*l['thickness'], True)
anelInt = Part.makeCylinder(l['rint'], l['thickness'])
anelExt = Part.makeCylinder(l['rext'], l['thickness'])
anelInt.translate(VX*(c['rext']+l['width']) - 0*VY*l['rext'])
anelExt.translate(VX*(c['rext']+l['width']) - 0*VY*l['rext'])
lingueta = lingueta.fuse(anelExt).cut(anelInt)

mola = espiral.fuse(anelInterno).fuse(lingueta)
doc.includeFeature(mola, 'Mola')
