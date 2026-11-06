EMCC = emcc
CXXFLAGS = -std=c++11 -O2 -Wall -Wextra

all: organizer.js

organizer.js: src/organizer.cpp
	$(EMCC) $(CXXFLAGS) src/organizer.cpp -o organizer.js \
		--bind -s MODULARIZE=1 -s EXPORT_NAME=createOrganizerModule \
		-s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT=web \
		-s NO_EXIT_RUNTIME=1

clean:
	rm -f organizer.js organizer.wasm
