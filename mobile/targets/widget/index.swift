import WidgetKit
import SwiftUI

// MARK: - Data Model

struct UpcomingItem: Codable {
    var name: String
    var daysUntil: Int
    var amount: Double
    var currency: String
}

struct WidgetData: Codable {
    var monthlyTotal: Double
    var currency: String
    var activeCount: Int
    var upcoming: [UpcomingItem]
}

// MARK: - Data Loading

private let APP_GROUP = "group.app.subtrack.mobile"
private let WIDGET_DATA_KEY = "subtrack_widget_data"

func loadWidgetData() -> WidgetData {
    guard
        let defaults = UserDefaults(suiteName: APP_GROUP),
        let raw = defaults.string(forKey: WIDGET_DATA_KEY),
        let data = raw.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(WidgetData.self, from: data)
    else {
        return WidgetData(monthlyTotal: 0, currency: "USD", activeCount: 0, upcoming: [])
    }
    return decoded
}

// MARK: - Timeline

struct SubTrackEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

struct SubTrackProvider: TimelineProvider {
    func placeholder(in context: Context) -> SubTrackEntry {
        SubTrackEntry(
            date: Date(),
            data: WidgetData(monthlyTotal: 29.99, currency: "USD", activeCount: 6, upcoming: [
                UpcomingItem(name: "Netflix", daysUntil: 2, amount: 15.99, currency: "USD"),
                UpcomingItem(name: "Spotify", daysUntil: 7, amount: 9.99, currency: "USD"),
            ])
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SubTrackEntry) -> Void) {
        completion(SubTrackEntry(date: Date(), data: loadWidgetData()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SubTrackEntry>) -> Void) {
        let entry = SubTrackEntry(date: Date(), data: loadWidgetData())
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Views

struct SmallWidgetView: View {
    let data: WidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SubTrack")
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
            Spacer()
            Text(formattedTotal)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.primary)
            Text("\(data.activeCount) active")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .containerBackground(.background, for: .widget)
    }

    var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = data.currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: data.monthlyTotal))
            ?? "\(data.currency) \(Int(data.monthlyTotal))"
    }
}

struct MediumWidgetView: View {
    let data: WidgetData

    var body: some View {
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                Text("SubTrack")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(formattedTotal)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.primary)
                Text("\(data.activeCount) active")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()
                .padding(.vertical, 12)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(data.upcoming.prefix(3), id: \.name) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(item.name)
                                .font(.caption)
                                .fontWeight(.medium)
                                .lineLimit(1)
                            Text(item.daysUntil == 0 ? "Today" : "in \(item.daysUntil)d")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(String(format: "%.0f", item.amount))
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                    }
                }
                if data.upcoming.isEmpty {
                    Text("No upcoming renewals")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .containerBackground(.background, for: .widget)
    }

    var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = data.currency
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: data.monthlyTotal))
            ?? "\(data.currency) \(Int(data.monthlyTotal))"
    }
}

struct SubTrackWidgetView: View {
    let entry: SubTrackEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(data: entry.data)
        default:
            SmallWidgetView(data: entry.data)
        }
    }
}

// MARK: - Widget Configuration

struct SubTrackWidget: Widget {
    let kind: String = "SubTrackWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SubTrackProvider()) { entry in
            SubTrackWidgetView(entry: entry)
        }
        .configurationDisplayName("SubTrack")
        .description("Your subscription spending at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
