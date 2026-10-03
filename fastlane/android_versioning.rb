module AndroidVersioning
  # Preserve the version code already distributed through internal testing.
  DEFAULT_FLOOR = 1_781_000_164
  MAX_VERSION_CODE = 2_100_000_000

  def self.next_code(client:, package_name:, floor: DEFAULT_FLOOR)
    floor = [DEFAULT_FLOOR, parse_code(floor)].max
    client.begin_edit(package_name: package_name)
    begin
      codes = Array(client.aab_version_codes) + Array(client.apks_version_codes)
      Array(client.tracks).each do |track|
        Array(track.releases).each do |release|
          codes.concat(Array(release.version_codes))
        end
      end

      latest = ([floor] + codes.map { |code| parse_code(code) }).max
      raise ArgumentError, "Google Play version code limit reached (#{latest})" if latest >= MAX_VERSION_CODE

      latest + 1
    ensure
      # Only inspect Play state; never commit this edit.
      client.abort_current_edit
    end
  end

  def self.parse_code(value)
    text = value.to_s
    unless text.match?(/\A[0-9]+\z/) && (1..MAX_VERSION_CODE).cover?(text.to_i)
      raise ArgumentError, "Invalid Android version code: #{text.inspect}"
    end
    text.to_i
  end
end
