Pod::Spec.new do |s|
  s.name           = 'ClipboardChange'
  s.version        = '1.0.0'
  s.summary        = "Reads the clipboard's change count without reading its contents"
  s.description    = 'Parso uses it to offer a copied link once per new copy, with no paste alert.'
  s.author         = 'Parso'
  s.homepage       = 'https://parso.ai'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
