SBBSUnstable
============

Unstable sandbox for Synchronet

Build instructions:
-------------------
(For non-win32 only)
Enter the 3rdp/build directory, and do both a RELEASE and a DEBUG build
gmake RELEASE=1
gmake DEBUG=1

Create a build directory somewhere.
mkdir -p /path/to/output

Change into it
cd /path/to/output

Generate the CMake cache
cmake /path/to/src

Build using whatever output was selected (msbuild, make, etc)
make
