**Stellector** - laser aided night sky explorer
==============

> *Stellector* is a compressed name for Stellar Projector and it intends to project the dynamics and representations of the sky, using the real open sky itself as a background for its tracings.


Overview
===========

<p align="center">
  <img style="width:50%;" alt="Horus Stellector" src="images\stellector_photo.jpg">
  <br>
  <em>Stellector components</em>
</p>

In this project we attach a laser pointer to two step motors in a 3D printed mounting, which are Bluetooth controlled by a software loaded in a smartphone, with the main purpose of teaching astronomy through the exploration of the night sky with the naked eye.

This is a low-cost project whose software and hardware have already been successfully tested.

We believe that science centers, observatories, museums, schools, universities and any other institutions interested in teaching and disseminating basic knowledge in astronomy can benefit from this project.


Introduction
============

Laser pointers are routinely used in night sky observation events. Due mainly to Rayleigh scattering, in a dark enough environment, the laser beam leaves a long trail along its path. Due to the large range of the beam, people who are close to the laser source agree that the beam ends at the same point in the celestial sphere. This effect, therefore, is used to guide people in identifying the stars in the real night sky.

The differential of this project lies in the control of the laser beam not by hand as is usually done, but through two step motors controlled via software by the user, which not only point to a specific location in the sky, but also continuously traverse paths between positions that have astronomical and cultural meanings, enabling a comprehensive and more dynamic view of the sky. These characteristics allow the exploration of the following astronomy teaching activities:

- Celestial bodies identification.
- Ray tracing of the constellation and asterism lines for different cultures.
- Ray tracing of the constellation borders.
- Ray tracing of the Milk Way galactic disk.
- Ray tracing of the planets movement along the year relatively to the stars.
- Identification of the ecliptic and solar positions along the year.
- In combination with binoculars or telescopes helping to find faint objects such as nebulae, galaxies, Uranus and main belt objects.
  
  Among others possibilities yet to be explored.


Description
============

<p align="center">
  <img style="width:80%;" alt="Horus Stellector" src="images\stellector_diagram.jpg">
  <br>
  <em>Stellector schematic diagram</em>
</p>

 The figure above shows the relationships between the parties that can be summarized by:

- A green laser pointer from which its laser module is extracted.
- Two 28BYJ-48 step motors and two ULN2003 drivers for the laser movement.
- A ESP32 module to interface step motor drivers, laser driver and environment sensors.
- A GY-521 accelerometer to determine the zenith orientation to fix the steppers reference.
- A GY-511 accelerometer and a HC-SR04 ultrasonic distance sensor used to establish a safe distance and orientation of the laser with respect to the ground in order to prevent the laser light from reaching people's eyes.
- A 10,000 mA.h LiPo power bank (Pineng model Pn-951) to power the electronics and electromechanical components.
- A simple electronic circuit with a TIP41 transistor to drive the laser current and for power distibution among the power bank and the other electronics.
- A 3D printed mounting that holds and interconects the mechanical and electronic structure.
- An arduino code, named [horus32.ino](horus/horus_esp32/horus32/), that is loaded in the ESP32 board.
- A HTML/Javascript progressive web app, named [*Hathor*](hathor/), that is loaded in a smartphone or any other portable device with Bluetooth communication.

We call the hardware [**Horus**](horus/), in reference to the Egyptian god of the sky. It is comprised by:

1. The [mechanical structure](horus/README.MD#mechanical-structure) that holds and interconnects the step motors, electronic sensors, microcontroler and battery. It is entirely 3D printed, where the pieces were designed using Python scripting for [FreeCAD](https://www.freecadweb.org/). The codes are [available here](horus/horus_3d_parts).
   
2. The [electronics](horus/README.MD#electric-circuit-diagram) that is composed by a simple circuit for distributing energy from battery to all the other electronic components.

We call the progressive web app [**Hathor**](hathor/), in refrence to the Egyptian goddess consort of *Horus*. It is reponsible for the *Horus* control.

To access *Hathor* web app via ClouFlare's CDN, [click here](https://rawcdn.githack.com/jocoteles/Stellector/446829e5dc1aeb43d528b2b9b58800cc3d9925e9/hathor/index.html).

The *Hathor* web app uses the following Javascript libraries:

- [THREE.js](https://github.com/mrdoob/three.js/), which is responsible in this project for performing many vector operations and coordinate transformations between the rectangular and spherical systems.
- [d3-celestial](https://github.com/ofrohn/d3-celestial) (a star map with d3.js) which provides for this project the celestial object coordinates, names and designations, constelation lines and boundaries and asterisms.
- [orb.js](https://github.com/lizard-isana/orb.js/) (JavaScript Library for Astronomical Calculations) -- that is used to obtain the equatorial coordinates of the Solar System objects
- [fmin](https://github.com/benfred/fmin) (Unconstrained function minimization in Javascript) which is used for minimizing the function that calculates the orientation of the local spherical coordinate system (defined by the orientation of the *Horus*) relative to the astronomical equatorial coordinate system.

Further Information
===================

A detailed explanation of the Stellector Project and its use for teaching astronomy can be found in this article.

Next Steps
==========

- Design a protective cover for the *Horus*.
- Implement a constant current drive for the laser using the ESP32 second core in substitution to the TIP41C transistor in order to keep the laser light intensity stable.
- Develop the functions for the *Find* window in the *Hathor* web app, which will be responsible for showing information about the sky in the region pointed by the laser.
- Improve the springs used to tension the stepper shafts. The ones used today - 3D printed with PLA filament - lose elasticity when stretched too long.

