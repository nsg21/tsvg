@echo off
rem 2014-10-05 14:51:40
rem
SET CPA=c:/bin/clojure/compiler.jar
rem SET CPA=c:/nsg/bin/clojure/compiler.jar

java -jar %CPA% --js=tsvg.js --js_output_file=tsvg.min.js
copy tsvg.min.js C:\Users\nsg\site\js
timeout /T 5
